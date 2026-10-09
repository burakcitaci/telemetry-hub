import { IsOptional, IsString, MaxLength } from 'class-validator';
import { LogsQueryDto } from './logs-query.dto';

// Shares the same validated time-window contract as Logs.
export class MetricsQueryDto extends LogsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metric?: string;
}
