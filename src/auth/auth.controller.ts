import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { jwtVerify } from 'jose';
import { FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth.service.js';
import {
  EmailRequestDto,
  EmailVerifyDto,
  LoginDto,
  RegisterDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  PasswordResetValidateDto,
} from '../auth/auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('email/request')
  async requestEmail(@Body() dto: EmailRequestDto) {
    return this.authService.requestEmail(dto);
  }

  @Post('email/verify')
  async verifyEmail(@Body() dto: EmailVerifyDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res() reply: FastifyReply) {
    const { token, user } = await this.authService.login(dto);

    reply.setCookie('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 초 단위
      path: '/',
    });

    return reply.send({ message: '로그인 성공', user });
  }

  @Post('logout')
  async logout(@Res() reply: FastifyReply) {
    reply.clearCookie('auth-token', { path: '/' });
    return reply.send(await this.authService.logout());
  }

  @Get('verify')
  async verify(@Req() req: FastifyRequest) {
    const token = req.cookies?.['auth-token'];
    if (!token) throw new UnauthorizedException('토큰 없음');
    const payload = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!),
    );
    return { isAuthenticated: true, user: payload.payload };
  }

  @Post('password-reset/request')
  async requestReset(
    @Body() dto: PasswordResetRequestDto,
    @Req() req: FastifyRequest,
  ) {
    const host = req.headers['host'] || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;

    return this.authService.requestPasswordReset(dto, baseUrl);
  }

  @Post('password-reset/validate')
  async validateReset(@Body() dto: PasswordResetValidateDto) {
    return this.authService.validateResetToken(dto);
  }

  @Post('password-reset/confirm')
  async confirmReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmResetPassword(dto);
  }
}
