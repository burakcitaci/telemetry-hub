import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class MonitorDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsIn(['metric', 'log', 'other']) type!: string;
  @IsString() @MinLength(1) @MaxLength(4000) query!: string;
  @IsIn(['above', 'below', 'above_or_equal', 'below_or_equal']) comparator!: string;
  @IsNumber() threshold!: number;
  @IsOptional() @IsNumber() warnThreshold?: number;
  @IsString() @MaxLength(32) evaluationWindow!: string;
  @IsOptional() @IsString() @MaxLength(4000) message?: string;
  @IsOptional() @IsString() @MaxLength(50) aggregation?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) groupBy?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(4) @IsIn(['email', 'slack', 'webhook', 'pagerduty'], { each: true }) targets?: string[];
  @IsOptional() @IsBoolean() isMuted?: boolean;
  @IsOptional() @IsString() @MaxLength(128) teamId?: string;
  @IsOptional() @IsString() @MaxLength(255) service?: string;
  @IsOptional() @IsString() @MaxLength(64) env?: string;
}
