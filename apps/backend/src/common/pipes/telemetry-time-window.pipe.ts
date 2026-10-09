import { Injectable, PipeTransform } from '@nestjs/common';
import {
  telemetryTimeWindow,
  type TelemetryTimeWindow,
} from '../../modules/telemetry/services/telemetry-time-window';

@Injectable()
export class TelemetryTimeWindowPipe implements PipeTransform {
  transform<T extends TelemetryTimeWindow>(value: T): T {
    telemetryTimeWindow(value, 'Timestamp');
    return value;
  }
}
