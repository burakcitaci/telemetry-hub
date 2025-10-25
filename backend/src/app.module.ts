import { Module } from '@nestjs/common';
import { TracesController } from './traces.controller';
import { LogsController } from './logs.controller';
import { ServicesController } from './services.controller';
import { EventsController } from './events.controller';
import { ClickhouseService } from './clickhouse.service';

@Module({
  imports: [],
  controllers: [TracesController, LogsController, ServicesController, EventsController],
  providers: [ClickhouseService],
})
export class AppModule {}
