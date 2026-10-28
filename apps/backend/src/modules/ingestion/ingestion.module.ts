import { Module } from '@nestjs/common';
import { IngestionKeysService } from './ingestion-keys.service';
import { IngestionMiddleware } from './ingestion.middleware';
import { AuthModule } from '../auth/auth.module';
import { IngestionKeysController } from './ingestion-keys.controller';

@Module({
  imports: [AuthModule],
  controllers: [IngestionKeysController],
  providers: [IngestionKeysService, IngestionMiddleware],
  exports: [IngestionMiddleware],
})
export class IngestionModule {}
