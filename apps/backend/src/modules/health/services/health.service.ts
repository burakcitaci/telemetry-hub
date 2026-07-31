import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ClickhouseService } from "../../telemetry/services/clickhouse.service";

@Injectable()
export class HealthService {
  constructor(private readonly clickhouse: ClickhouseService) {}

  getHealth() {
    return {
      status: "ok",
      service: "backend-api",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  async checkDatabase(): Promise<{
    status: "healthy";
    latencyMs: number;
  }> {
    const startedAt = Date.now();

    try {
      await this.clickhouse.ping();
      return {
        status: "healthy",
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: "unhealthy",
        latencyMs: Date.now() - startedAt,
        message:
          error instanceof Error ? error.message : "ClickHouse ping failed",
      });
    }
  }
}
