import { Module } from '@nestjs/common';
import { TelemetryModule } from './telemetry.module';
import { MetricsService } from './services/metrics.service';
import { MetricsController } from './controllers/metrics.controller';
import { LoggerModule } from '../../common/logger/logger.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TelemetryModule, LoggerModule, AuthModule],
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
