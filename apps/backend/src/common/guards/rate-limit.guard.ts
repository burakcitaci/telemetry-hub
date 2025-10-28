import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requestCounts = new Map<string, number>();
  private readonly limit = 100; // requests per minute
  private readonly windowMs = 60000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip;
    const now = Date.now();

    // Clean up old entries
    this.cleanup(now);

    const count = this.requestCounts.get(ip) || 0;
    
    if (count >= this.limit) {
      return false;
    }

    this.requestCounts.set(ip, count + 1);
    return true;
  }

  private cleanup(now: number): void {
    for (const [ip, timestamp] of Array.from(this.requestCounts.entries())) {
      if (now - timestamp > this.windowMs) {
        this.requestCounts.delete(ip);
      }
    }
  }
}
