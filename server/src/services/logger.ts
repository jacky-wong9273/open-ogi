import winston from "winston";
import type { Config } from "../config.js";

export function createLogger(config: Config): winston.Logger {
  return winston.createLogger({
    level: config.LOG_LEVEL,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: { service: "open-ogi-server" },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      }),
      new winston.transports.File({ filename: "logs/combined.log" }),
    ],
  });
}
