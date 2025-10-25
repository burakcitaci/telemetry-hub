import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { TracesController } from './traces.controller';
import { LogsController } from './logs.controller';
import { ServicesController } from './services.controller';
import { EventsController } from './events.controller';
import { DataService } from './data.service';
import { ClickhouseService } from './clickhouse.service';

@Module({
  imports: [],
  controllers: [DataController, TracesController, LogsController, ServicesController, EventsController],
  providers: [DataService, ClickhouseService],
})
export class AppModule {}
