import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MypageController } from '../mypage/mypage.controller.js';
import { MypageService } from '../mypage/mypage.service.js';
import { User, UserSchema } from '../schemas/user.schema.js';
import { Report, ReportSchema } from '../schemas/report.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MypageController],
  providers: [MypageService],
})
export class MypageModule {}
