import { registerAs } from "@nestjs/config";

export interface LoggerConfig {
  level: string;
  format: string;
  timestamp: boolean;
  prettyPrint: boolean;
}

export default registerAs("logger", (): LoggerConfig => ({
  level: process.env.LOG_LEVEL || "info",
  format: process.env.LOG_FORMAT || "json",
  timestamp: process.env.LOG_TIMESTAMP !== "false",
  prettyPrint: process.env.NODE_ENV === "development",
}));
