import { Injectable } from "@nestjs/common";
import { ClickhouseService } from "./clickhouse.service";

@Injectable()
export class TelemetryService {
  constructor(private readonly clickhouse: ClickhouseService) {}

  // Add any additional telemetry-related business logic here
  // This service can orchestrate multiple data sources if needed
}
