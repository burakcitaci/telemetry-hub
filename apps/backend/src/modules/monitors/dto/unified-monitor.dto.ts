import { IsBoolean, IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AGGREGATIONS, SIGNAL_TYPES } from '../signal-adapter';
import { COMPARATORS } from '../monitor.model';
import { MAX_ALERT_PAGE_SIZE } from '../monitor-alert-history';

export class CreateMonitorDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsIn(SIGNAL_TYPES) signal_type!: typeof SIGNAL_TYPES[number];
  @IsString() @MaxLength(4000) query!: string;
  @IsIn(AGGREGATIONS) aggregation!: typeof AGGREGATIONS[number];
  @IsIn(COMPARATORS) comparator!: typeof COMPARATORS[number];
  @IsNumber() threshold!: number;
  @IsInt() @Min(1) @Max(Math.floor(Number.MAX_SAFE_INTEGER / 1000)) window_seconds!: number;
  @ValidateIf((_object, value) => value !== undefined) @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) metric_name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(128) field?: string;
  @IsOptional() @IsString() @MaxLength(128) team_id?: string;
  @IsOptional() @IsString() @MaxLength(255) service?: string;
  @IsOptional() @IsString() @MaxLength(64) env?: string;
  @IsOptional() @IsISO8601({ strict: true }) muted_until?: string;
  @ValidateIf((_object, value) => value !== undefined) @IsInt() @Min(0) @Max(Math.floor(Number.MAX_SAFE_INTEGER / 1000)) cooldown_seconds?: number;
}

export class PatchMonitorDto extends PartialType(CreateMonitorDto) {}

export class AlertsQueryDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(128) monitor_id?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(MAX_ALERT_PAGE_SIZE) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000000) offset?: number;
}
