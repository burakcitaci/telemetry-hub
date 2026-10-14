import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { MonitorsController } from '../auth/monitors.controller';
import { MonitorEvaluatorService } from './monitor-evaluator.service';
import { MonitorQueryService } from './monitor-query.service';

@Module({ imports: [AuthModule, TelemetryModule], controllers: [MonitorsController],
  providers: [MonitorQueryService, MonitorEvaluatorService], exports: [MonitorEvaluatorService] })
export class MonitorsModule {}
