import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: "ok",
      service: "backend-api",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  async checkDatabase(): Promise<{ status: string; details?: any }> {
    // Add database health check logic here
    return { status: "healthy" };
  }
}
