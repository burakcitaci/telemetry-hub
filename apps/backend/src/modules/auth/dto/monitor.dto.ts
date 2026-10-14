import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class MonitorDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsIn(['metric', 'log', 'trace']) type!: string;
  @IsString() @MinLength(1) @MaxLength(4000) query!: string;
  @IsIn(['above', 'below', 'above_or_equal', 'below_or_equal']) comparator!: string;
  @IsNumber() threshold!: number;
  @IsOptional() @IsNumber() warnThreshold?: number;
  @IsIn(['1m', '5m', '15m', '30m', '1h']) evaluationWindow!: string;
  @IsOptional() @IsIn(['gauge', 'sum', 'histogram']) metricType?: string;
  @IsOptional() @IsIn(['ERROR', 'WARN', 'INFO', 'DEBUG', 'OK', 'UNSET']) signalStatus?: string;
  @IsOptional() @IsIn(['no_data', 'zero']) noDataPolicy?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(128) logAttribute?: string;
  @IsOptional() @IsString() @MaxLength(4000) message?: string;
  @IsOptional() @IsIn(['avg', 'sum', 'min', 'max', 'count', 'p95']) aggregation?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsString({ each: true }) groupBy?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(4) @IsIn(['email', 'slack', 'webhook', 'pagerduty'], { each: true }) targets?: string[];
  @IsOptional() @IsBoolean() isMuted?: boolean;
  @IsOptional() @IsString() @MaxLength(128) teamId?: string;
  @IsOptional() @IsString() @MaxLength(255) service?: string;
  @IsOptional() @IsString() @MaxLength(64) env?: string;
}
