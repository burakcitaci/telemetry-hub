import { registerAs } from "@nestjs/config";

export interface AppConfig {
  port: number;
  nodeEnv: string;
  host: string;
  name: string;
  version: string;
}

export default registerAs("app", (): AppConfig => ({
  port: parseInt(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  host: process.env.HOST || "0.0.0.0",
  name: process.env.APP_NAME || "telemetry-backend",
  version: process.env.APP_VERSION || "1.0.0",
}));
