import { Controller, Get } from "@nestjs/common";
import { HealthService } from "../services/health.service";
import { CentralLoggerService } from "../../../common/logger/central-logger.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly logger: CentralLoggerService,
  ) {}

  @Get()
  getHealth() {
    this.logger.log("Health check endpoint called", "HealthController");
    return this.healthService.getHealth();
  }

  @Get("database")
  async checkDatabase() {
    this.logger.log("Database health check endpoint called", "HealthController");
    const result = await this.healthService.checkDatabase();
    this.logger.logWithAttributes(
      "Database health check completed",
      "INFO",
      { result },
      "HealthController",
    );
    return result;
  }
}
