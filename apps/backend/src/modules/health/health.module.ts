import { Module } from "@nestjs/common";
import { HealthController } from "./controllers/health.controller";
import { HealthService } from "./services/health.service";
import { DataController } from "./controllers/data.controller";
import { DataService } from "./services/data.service";

@Module({
  controllers: [HealthController, DataController],
  providers: [HealthService, DataService],
  exports: [HealthService],
})
export class HealthModule {}
