import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3100),
  WS_PORT: z.coerce.number().default(3101),
  JWT_SECRET: z
    .string()
    .min(32)
    .default("change-me-in-production-min-32-chars!!"),
  JWT_EXPIRY: z.string().default("24h"),
  DATABASE_URL: z.string().default("file:./data/open-ogi.db"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().min(8).default("admin1234"),
  DEFAULT_LLM_PROVIDER: z.string().default("deepseek"),
  DEFAULT_LLM_MODEL: z.string().default("deepseek-chat"),
  DEFAULT_LLM_BASE_URL: z.string().default("https://api.deepseek.com"),
  DEFAULT_LLM_API_KEY: z.string().default(""),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  HMAC_SECRET: z.string().optional(),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  AUTH_RATE_LIMIT_LOCKOUT_MS: z.coerce.number().default(300_000),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const config = envSchema.parse(process.env);

  // Production hardening warnings
  if (config.NODE_ENV === "production") {
    if (config.JWT_SECRET.includes("change-me")) {
      throw new Error(
        "CRITICAL: JWT_SECRET must be changed from default in production",
      );
    }
    if (config.ADMIN_PASSWORD === "admin1234") {
      throw new Error(
        "CRITICAL: ADMIN_PASSWORD must be changed from default in production",
      );
    }
    if (config.CORS_ORIGIN === "*") {
      console.warn(
        "WARNING: CORS_ORIGIN is set to '*' in production. Restrict to known domains.",
      );
    }
  }

  return config;
}
