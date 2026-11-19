import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { TelemetryQueryDto } from './query.dto';

function asArray({ value }: { value: string | string[] }) {
  return typeof value === 'string' ? [value] : value;
}

export class LogsQueryDto extends TelemetryQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive text search', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(asArray)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  services?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(asArray)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  statuses?: string[];

  @ApiPropertyOptional({
    description: 'Inclusive start, ISO 8601 with timezone',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive end, ISO 8601 with timezone' })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;
}
