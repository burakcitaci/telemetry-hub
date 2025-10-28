import { registerAs } from "@nestjs/config";

export interface DatabaseConfig {
  type: string;
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
}

export default registerAs("database", (): DatabaseConfig => ({
  type: process.env.DB_TYPE || "clickhouse",
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
  minConnections: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 60000,
}));
