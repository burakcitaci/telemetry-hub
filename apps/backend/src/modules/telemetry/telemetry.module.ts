import { Module } from "@nestjs/common";
import { ClickhouseService } from "./services/clickhouse.service";
import { TracesController } from "./controllers/traces.controller";
import { LogsController } from "./controllers/logs.controller";
import { ServicesController } from "./controllers/services.controller";
import { EventsController } from "./controllers/events.controller";
import { EnvironmentsController } from './controllers/environments.controller';
import { LoggerModule } from "../../common/logger/logger.module";
import { AuthModule } from '../auth/auth.module';
import { FiltersController } from './controllers/filters.controller';

@Module({
  imports: [LoggerModule, AuthModule],
  controllers: [TracesController, LogsController, ServicesController, EventsController, EnvironmentsController, FiltersController],
  providers: [ClickhouseService],
  exports: [ClickhouseService],
})
export class TelemetryModule {}
