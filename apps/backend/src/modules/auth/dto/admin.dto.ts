import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, NotEquals } from 'class-validator';

export class TeamDto {
  @NotEquals('all') @Matches(/^[a-z0-9][a-z0-9._-]{0,63}$/) id!: string;
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
}
export class PasswordDto {
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}
export class CreateUserDto extends PasswordDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsIn(['admin', 'user']) role!: 'admin' | 'user';
  @IsOptional() @Matches(/^[a-z0-9][a-z0-9._-]{0,63}$/) teamId?: string;
}
export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(12) @MaxLength(128) password?: string;
  @IsOptional() @IsIn(['admin', 'user']) role?: 'admin' | 'user';
  // Empty string explicitly removes membership; omitted field preserves it.
  @IsOptional() @Matches(/^(?:[a-z0-9][a-z0-9._-]{0,63})?$/) teamId?: string;
}
