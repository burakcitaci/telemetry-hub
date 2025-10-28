import { registerAs } from "@nestjs/config";

export interface HealthConfig {
  checkInterval: number;
  timeout: number;
  maxRetries: number;
}

export default registerAs("health", (): HealthConfig => ({
  checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
  maxRetries: parseInt(process.env.HEALTH_MAX_RETRIES) || 3,
}));
