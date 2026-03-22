import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import type { AppDatabase } from "../db/index.js";
import { users } from "../db/schema.js";
import type { Config } from "../config.js";
import type { User, AuthSession, LoginCredentials } from "@open-ogi/shared";
import { generateId } from "@open-ogi/shared";

export class AuthService {
  constructor(
    private db: AppDatabase,
    private config: Config,
  ) {}

  async initialize(): Promise<void> {
    const admin = this.db
      .select()
      .from(users)
      .where(eq(users.username, this.config.ADMIN_USERNAME))
      .get();

    if (!admin) {
      const hash = await bcrypt.hash(this.config.ADMIN_PASSWORD, 12);
      this.db
        .insert(users)
        .values({
          id: generateId(),
          username: this.config.ADMIN_USERNAME,
          email: "admin@open-ogi.local",
          passwordHash: hash,
          role: "admin",
        })
        .run();
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthSession | null> {
    const user = this.db
      .select()
      .from(users)
      .where(
        and(eq(users.username, credentials.username), eq(users.isActive, true)),
      )
      .get();

    if (!user) return null;

    const valid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!valid) return null;

    this.db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, user.id))
      .run();

    const token = jwt.sign({ userId: user.id }, this.config.JWT_SECRET, {
      expiresIn: this.config.JWT_EXPIRY as jwt.SignOptions["expiresIn"],
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: "refresh" },
      this.config.JWT_SECRET,
      { expiresIn: "7d" as jwt.SignOptions["expiresIn"] },
    );

    return {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      refreshToken,
    };
  }

  verifyToken(token: string): { userId: string } | null {
    try {
      const payload = jwt.verify(token, this.config.JWT_SECRET) as {
        userId: string;
      };
      return payload;
    } catch {
      return null;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const row = this.db.select().from(users).where(eq(users.id, id)).get();

    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role as User["role"],
      permissions: [],
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt ?? undefined,
    };
  }

  async listUsers(): Promise<User[]> {
    const rows = this.db.select().from(users).all();
    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role as User["role"],
      permissions: [],
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt ?? undefined,
    }));
  }

  async createUser(
    username: string,
    email: string,
    password: string,
    role: User["role"],
  ): Promise<User> {
    const id = generateId();
    const hash = await bcrypt.hash(password, 12);
    this.db
      .insert(users)
      .values({ id, username, email, passwordHash: hash, role })
      .run();
    return (await this.getUserById(id))!;
  }

  async updateUserRole(id: string, role: User["role"]): Promise<void> {
    this.db
      .update(users)
      .set({ role, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .run();
  }

  async deactivateUser(id: string): Promise<void> {
    this.db
      .update(users)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .run();
  }
}
