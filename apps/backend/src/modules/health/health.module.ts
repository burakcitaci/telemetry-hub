import { Module } from "@nestjs/common";
import { HealthController } from "./controllers/health.controller";
import { HealthService } from "./services/health.service";
import { TelemetryModule } from "../telemetry/telemetry.module";

@Module({
  imports: [TelemetryModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
