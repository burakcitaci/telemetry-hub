import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';
import { TelemetryQueryDto } from './query.dto';

export class ServiceSummaryQueryDto extends TelemetryQueryDto {
  @ApiProperty({ description: 'Inclusive start, ISO 8601 with timezone' })
  @IsISO8601({ strict: true })
  from!: string;

  @ApiProperty({ description: 'Inclusive end, ISO 8601 with timezone' })
  @IsISO8601({ strict: true })
  to!: string;
}
