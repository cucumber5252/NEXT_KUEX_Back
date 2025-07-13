import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MypageController } from 'src/mypage/mypage.controller';
import { MypageService } from 'src/mypage/mypage.service';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Report, ReportSchema } from 'src/schemas/report.schema';

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
