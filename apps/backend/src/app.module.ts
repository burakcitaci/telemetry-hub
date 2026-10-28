import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import appConfig from "./config/app.config";
import corsConfig from "./config/cors.config";
import clickhouseConfig from "./config/clickhouse.config";
import swaggerConfig from "./config/swagger.config";
import { TelemetryModule } from "./modules/telemetry/telemetry.module";
import { HealthModule } from "./modules/health/health.module";
import { LoggerModule } from "./common/logger/logger.module";
import { MetricsModule } from "./modules/telemetry/metrics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module';
import { MonitorsModule } from './modules/monitors/monitors.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        corsConfig,
        clickhouseConfig,
        swaggerConfig,
      ],
      envFilePath: [
        `.env.${process.env.NODE_ENV || "development"}.local`,
        `.env.${process.env.NODE_ENV || "development"}`,
        ".env.local",
        ".env",
        `../../.env.${process.env.NODE_ENV || "development"}.local`,
        `../../.env.${process.env.NODE_ENV || "development"}`,
        "../../.env.local",
        "../../.env",
      ],
    }),
    LoggerModule,
    AuthModule,
    IngestionModule,
    TelemetryModule,
    MetricsModule,
    HealthModule,
    InfrastructureModule,
    MonitorsModule,
  ],
})
export class AppModule {}
