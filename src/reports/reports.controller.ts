import { Controller, Get, Post, Param, Req, Res } from '@nestjs/common';
import { RepotsService } from '../reports/reports.service.js';
import { FastifyRequest, FastifyReply } from 'fastify';

@Controller('repo.js')
export class RepotsController {
  constructor(private readonly repotsService: RepotsService) {}

  @Get()
  async getRepots(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    try {
      const result = await this.repotsService.getRepots(req);
      return res.status(200).send(result);
    } catch (err) {
      console.error('[보고서 조회 실패]', err);
      return res.status(500).send({ error: '서버 오류' });
    }
  }

  @Get(':id')
  async getReportById(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const result = await this.repotsService.getReportById(id, req);
      if (!result)
        return res
          .status(404)
          .send({ error: '해당 보고서 정보를 찾을 수 없습니다.' });
      return res.status(200).send(result);
    } catch (err) {
      console.error('[보고서 상세 조회 실패]', err);
      return res.status(500).send({ error: '서버 오류' });
    }
  }

  @Post(':id/like')
  async toggleLike(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const result = await this.repotsService.toggleLike(id, req);
      return res.status(200).send(result);
    } catch (err) {
      console.error('[좋아요 토글 실패]', err);
      return res.status(500).send({ error: '서버 오류' });
    }
  }

  @Get(':id/like')
  async getLikeStatus(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const result = await this.repotsService.getLikeStatus(id, req);
      return res.status(200).send(result);
    } catch (err) {
      console.error('[좋아요 상태 조회 실패]', err);
      return res.status(500).send({ error: '서버 오류' });
    }
  }
}
