import { registerAs } from "@nestjs/config";

export interface ClickhouseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  timeout: number;
}

export default registerAs("clickhouse", (): ClickhouseConfig => ({
  host: process.env.CLICKHOUSE_HOST || "clickhouse",
  port: parseInt(process.env.CLICKHOUSE_PORT) || 8123,
  database: process.env.CLICKHOUSE_DATABASE || "default",
  username: process.env.CLICKHOUSE_USERNAME || "default",
  password: process.env.CLICKHOUSE_PASSWORD || "",
  timeout: parseInt(process.env.CLICKHOUSE_TIMEOUT) || 30000,
}));
