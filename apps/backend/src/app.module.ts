import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import appConfig from "./config/app.config";
import corsConfig from "./config/cors.config";
import clickhouseConfig from "./config/clickhouse.config";
import otelConfig from "./config/otel.config";
import validationConfig from "./config/validation.config";
import loggerConfig from "./config/logger.config";
import healthConfig from "./config/health.config";
import { TelemetryModule } from "./modules/telemetry/telemetry.module";
import { HealthModule } from "./modules/health/health.module";
import { LoggerModule } from "./common/logger/logger.module";
import { AuthModule } from "./modules/auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        corsConfig,
        clickhouseConfig,
        otelConfig,
        validationConfig,
        loggerConfig,
        healthConfig,
      ],
      envFilePath: [
        `.env.${process.env.NODE_ENV || "development"}.local`,
        `.env.${process.env.NODE_ENV || "development"}`,
        ".env.local",
        ".env",
      ],
    }),
    AuthModule,
    LoggerModule,
    TelemetryModule,
    HealthModule,
  ],
})
export class AppModule {}
