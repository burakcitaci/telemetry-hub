import { positiveInteger } from './environment';
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
  port: positiveInteger('CLICKHOUSE_PORT', 8123, 65535),
  database: process.env.CLICKHOUSE_DATABASE || "default",
  username: process.env.CLICKHOUSE_USERNAME || "default",
  password: process.env.CLICKHOUSE_PASSWORD || "",
  timeout: positiveInteger('CLICKHOUSE_TIMEOUT', 30000),
}));
