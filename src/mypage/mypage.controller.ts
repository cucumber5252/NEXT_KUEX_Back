import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { MypageService } from 'src/mypage/mypage.service';
import { FastifyRequest } from 'fastify';

@Controller('mypage')
export class MypageController {
  constructor(private readonly mypageService: MypageService) {}

  @Get()
  async getMypage(@Req() req: FastifyRequest) {
    const token = (req.cookies as any)['auth-token'];
    if (!token) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }

    return this.mypageService.getMypageData(token);
  }
}
