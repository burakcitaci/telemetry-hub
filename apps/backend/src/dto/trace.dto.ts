import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class TraceIdParamDto {
  @ApiProperty({
    description: "W3C trace identifier",
    example: "391dae938234560b16bb63f51501cb6f",
  })
  @IsString()
  @Matches(/^[0-9a-fA-F]{32}$/, {
    message: "traceId must be a 32-character hexadecimal identifier",
  })
  traceId: string;
}
