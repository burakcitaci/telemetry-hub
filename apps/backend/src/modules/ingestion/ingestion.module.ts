import { Module } from '@nestjs/common';
import { IngestionKeysService } from './ingestion-keys.service';
import { IngestionMiddleware } from './ingestion.middleware';

@Module({
  providers: [IngestionKeysService, IngestionMiddleware],
  exports: [IngestionMiddleware],
})
export class IngestionModule {}
