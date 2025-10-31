import { Module } from "@nestjs/common";
import { ClickhouseService } from "./services/clickhouse.service";
import { TelemetryService } from "./services/telemetry.service";
import { TracesController } from "./controllers/traces.controller";
import { LogsController } from "./controllers/logs.controller";
import { ServicesController } from "./controllers/services.controller";
import { EventsController } from "./controllers/events.controller";
import { LoggerModule } from "../../common/logger/logger.module";

@Module({
  imports: [LoggerModule],
  controllers: [TracesController, LogsController, ServicesController, EventsController],
  providers: [ClickhouseService, TelemetryService],
  exports: [ClickhouseService, TelemetryService],
})
export class TelemetryModule {}
