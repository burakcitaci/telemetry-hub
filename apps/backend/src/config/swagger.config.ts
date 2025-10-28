import { registerAs } from "@nestjs/config";

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  path: string;
}

export default registerAs("swagger", (): SwaggerConfig => ({
  title: process.env.SWAGGER_TITLE || "Telemetry Hub API",
  description: process.env.SWAGGER_DESCRIPTION || "Telemetry Hub API documentation",
  version: process.env.SWAGGER_VERSION || "1.0.0",
  path: process.env.SWAGGER_PATH || "api/docs",
}));
