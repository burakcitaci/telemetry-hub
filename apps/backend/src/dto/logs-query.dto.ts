import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { TelemetryQueryDto } from './query.dto';

export class LogsQueryDto extends TelemetryQueryDto {
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
