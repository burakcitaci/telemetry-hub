import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from "class-validator";
import { PaginationDto } from "./pagination.dto";

export class TelemetryQueryDto extends PaginationDto {
  @ApiPropertyOptional({ default: 'production', description: 'Deployment environment' })
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/)
  env: string = 'production';

  @ApiPropertyOptional({
    description: "Only return telemetry emitted by this service",
    maxLength: 255,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  service?: string;
}
