import { Module } from '@nestjs/common';
import { CustomLoggerService } from './logger.service';
import { CentralLoggerService } from './central-logger.service';

@Module({
  providers: [CustomLoggerService, CentralLoggerService],
  exports: [CustomLoggerService, CentralLoggerService],
})
export class LoggerModule {}
