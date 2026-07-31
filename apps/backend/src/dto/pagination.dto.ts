import { IsOptional, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationDto {
  @ApiPropertyOptional({
    description: "Number of items to return",
    minimum: 1,
    maximum: 500,
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number = 100;

  @ApiPropertyOptional({
    description: "Number of items to skip",
    minimum: 0,
    maximum: 1000000,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  @Type(() => Number)
  offset?: number = 0;
}
