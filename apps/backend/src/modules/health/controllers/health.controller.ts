import { Controller, Get } from "@nestjs/common";
import { HealthService } from "../services/health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get("database")
  async checkDatabase() {
    return this.healthService.checkDatabase();
  }
}
