import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformStore } from '../auth/platform-store.service';
import { alertRetentionConfig } from './monitoring.config';

@Injectable()
export class AlertRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertRetentionService.name);
  private timer?: ReturnType<typeof setInterval>;
  constructor(private readonly store: PlatformStore, private readonly config: ConfigService) {
    this.store.registerMonitorCleanup(() => this.onModuleDestroy());
  }

  onModuleInit(): void {
    const retention = alertRetentionConfig(this.config);
    this.prune();
    this.timer = setInterval(() => this.prune(), retention.intervalSeconds * 1000);
    this.timer.unref();
  }

  onModuleDestroy(): void { clearInterval(this.timer); }

  private prune(): void {
    try { this.store.monitorRepository.history.prune(); }
    catch { this.logger.error('Alert retention pruning failed.'); }
  }
}
