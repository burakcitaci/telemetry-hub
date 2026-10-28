import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, NotEquals } from 'class-validator';

export class CreateIngestionKeyDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @NotEquals('all') @Matches(/^[a-z0-9][a-z0-9._-]{0,63}$/) teamId!: string;
  @IsOptional() @NotEquals('all') @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/) env?: string;
  @IsInt() @Min(1) @Max(3650) expiresInDays!: number;
}
