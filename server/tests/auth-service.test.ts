import { describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "../src/services/auth.js";
import type { Config } from "../src/config.js";
import { initDatabase, closeDatabase } from "../src/db/index.js";
import type { AppDatabase } from "../src/db/index.js";

function testConfig(): Config {
  return {
    NODE_ENV: "test",
    PORT: 3100,
    WS_PORT: 3101,
    JWT_SECRET: "test-secret-min-32-chars-for-testing!!",
    JWT_EXPIRY: "24h",
    DATABASE_URL: ":memory:",
    LOG_LEVEL: "error",
    CORS_ORIGIN: "*",
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "admin1234",
    DEFAULT_LLM_PROVIDER: "deepseek",
    DEFAULT_LLM_MODEL: "deepseek-chat",
    DEFAULT_LLM_BASE_URL: "https://api.deepseek.com",
    DEFAULT_LLM_API_KEY: "",
    RATE_LIMIT_WINDOW_MS: 900_000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    AUTH_RATE_LIMIT_MAX: 5,
    AUTH_RATE_LIMIT_WINDOW_MS: 900_000,
    AUTH_RATE_LIMIT_LOCKOUT_MS: 1_800_000,
  };
}

describe("AuthService", () => {
  let db: AppDatabase;
  let service: AuthService;

  beforeEach(() => {
    db = initDatabase(":memory:");
    service = new AuthService(db, testConfig());
  });

  describe("initialize", () => {
    it("creates default admin user", async () => {
      await service.initialize();
      const users = await service.listUsers();
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe("admin");
      expect(users[0].role).toBe("admin");
    });

    it("does not duplicate admin on second init", async () => {
      await service.initialize();
      await service.initialize();
      const users = await service.listUsers();
      expect(users).toHaveLength(1);
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("returns session for valid credentials", async () => {
      const session = await service.login({
        username: "admin",
        password: "admin1234",
      });
      expect(session).not.toBeNull();
      expect(session!.token).toBeTruthy();
      expect(session!.userId).toBeTruthy();
    });

    it("returns null for invalid password", async () => {
      const session = await service.login({
        username: "admin",
        password: "wrong",
      });
      expect(session).toBeNull();
    });

    it("returns null for non-existent user", async () => {
      const session = await service.login({
        username: "nobody",
        password: "test",
      });
      expect(session).toBeNull();
    });
  });

  describe("verifyToken", () => {
    it("verifies a valid token", async () => {
      await service.initialize();
      const session = await service.login({
        username: "admin",
        password: "admin1234",
      });
      const payload = service.verifyToken(session!.token);
      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe(session!.userId);
    });

    it("returns null for invalid token", () => {
      expect(service.verifyToken("invalid")).toBeNull();
    });
  });

  describe("createUser", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("creates a user with specified role", async () => {
      const user = await service.createUser(
        "developer",
        "dev@test.com",
        "password123",
        "operator",
      );
      expect(user.username).toBe("developer");
      expect(user.role).toBe("operator");
      expect(user.isActive).toBe(true);
    });
  });

  describe("updateUserRole", () => {
    it("changes user role", async () => {
      await service.initialize();
      const user = await service.createUser(
        "dev",
        "dev@test.com",
        "pass1234",
        "viewer",
      );
      await service.updateUserRole(user.id, "operator");
      const updated = await service.getUserById(user.id);
      expect(updated!.role).toBe("operator");
    });
  });

  describe("deactivateUser", () => {
    it("deactivates a user", async () => {
      await service.initialize();
      const user = await service.createUser(
        "temp",
        "temp@test.com",
        "pass1234",
        "viewer",
      );
      await service.deactivateUser(user.id);
      const updated = await service.getUserById(user.id);
      expect(updated!.isActive).toBe(false);
    });
  });
});
