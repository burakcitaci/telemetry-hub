import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AUTH_COOKIE, TenantJwtGuard } from './tenant-jwt.guard';
import type { TenantRequest } from './auth.types';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('logout')
  @UseGuards(TenantJwtGuard)
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const tenantRequest = request as TenantRequest;
    this.auth.logout({ tenantSlug: tenantRequest.tenant, role: tenantRequest.userRole,
      teamId: tenantRequest.userTeam, sub: tenantRequest.authSubject, version: tenantRequest.authVersion });
    response.clearCookie(AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    return { success: true };
  }

  @Post('login')
  async login(
    @Body() credentials: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, session } = await this.auth.login(credentials, request.ip);
    response.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return session;
  }

  @Get('session')
  @UseGuards(TenantJwtGuard)
  session(@Req() request: Request) {
    const tenantRequest = request as TenantRequest;
    return this.auth.session({
      tenantSlug: tenantRequest.tenant,
      role: tenantRequest.userRole,
      teamId: tenantRequest.userTeam,
    });
  }
}
import { ApiTags } from '@nestjs/swagger';
