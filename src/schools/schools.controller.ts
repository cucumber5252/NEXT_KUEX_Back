import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { SchoolsService } from 'src/schools/schools.service';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  async getSchools(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    try {
      const result = await this.schoolsService.getSchools(req);
      return res.status(200).send(result);
    } catch (err) {
      console.error('[학교 목록 조회 실패]', err);
      return res.status(500).send({ error: '서버 오류' });
    }
  }

  @Get('locations')
  async getSchoolLocations(@Res() res: FastifyReply) {
    try {
      const result = await this.schoolsService.getSchoolLocations();
      return res.status(200).send(result);
    } catch (err) {
      console.error('[학교 위치 정보 조회 실패]', err);
      return res.status(500).send({ error: '서버 오류' });
    }
  }

  @Get(':id')
  async getSchoolById(@Param('id') id: string, @Res() res: FastifyReply) {
    try {
      const result = await this.schoolsService.getSchoolById(id);
      if (!result) {
        return res
          .status(404)
          .send({ error: '해당 학교 정보를 찾을 수 없습니다.' });
      }
      return res.status(200).send(result);
    } catch (err) {
      console.error('[학교 상세 조회 실패]', err);
      return res.status(500).send({ error: '서버 오류' });
    }
  }
}
