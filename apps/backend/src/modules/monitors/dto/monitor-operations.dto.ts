import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, MaxLength, Min, ValidateIf } from 'class-validator';

export class TeamDestinationDto {
  @ValidateIf((_value, destination) => destination !== null) @Matches(/^[a-z0-9][a-z0-9_-]{0,63}$/) destination!: string | null;
}

export class CreateMaintenanceDto {
  @IsString() @MaxLength(120) name!: string;
  @IsISO8601({ strict: true }) starts_at!: string;
  @IsISO8601({ strict: true }) ends_at!: string;
  @IsOptional() @Matches(/^[a-z0-9][a-z0-9._-]{0,63}$/) team_id?: string;
  @IsOptional() @IsString() @MaxLength(255) service?: string;
}

export class AlertTriageDto {
  @IsInt() @Min(0) version!: number;
  @IsIn(['acknowledge', 'assign', 'note']) action!: 'acknowledge' | 'assign' | 'note';
  @IsOptional() @IsString() @MaxLength(128) assignee_id?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
