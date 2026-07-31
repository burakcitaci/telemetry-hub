import { Module } from '@nestjs/common';
import { CentralLoggerService } from './central-logger.service';

@Module({
  providers: [CentralLoggerService],
  exports: [CentralLoggerService],
})
export class LoggerModule {}
