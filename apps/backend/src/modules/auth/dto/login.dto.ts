import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
  tenantSlug!: string;
}
