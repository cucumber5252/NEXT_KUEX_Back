import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { jwtVerify } from 'jose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from 'src/schemas/report.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import { ReportType, SchoolType, CountryType, ContinentType } from 'src/types';
import { ReportResponse } from 'src/types/report';

@Injectable()
export class MypageService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async getMypageData(token: string) {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    let decoded: any;
    try {
      const { payload } = await jwtVerify(token, secret);
      decoded = payload as { userId: string; email: string };
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const user = await this.userModel.findById(decoded.userId).lean();
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const savedReports = await this.reportModel
      .find({ likedUsers: decoded.userId })
      .populate({
        path: 'schoolId',
        populate: {
          path: 'countryId',
          populate: { path: 'continentId' },
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    const formattedReports: ReportResponse[] = savedReports
      .filter((report) => !!report.schoolId && !!(report.schoolId as any)._id)
      .map((report) => {
        const reportData = report as unknown as ReportType & {
          schoolId: SchoolType & {
            countryId: CountryType & {
              continentId: ContinentType;
            };
          };
        };
        return {
          id: reportData._id.toString(),
          hashtags: reportData.hashtags,
          createdAt: reportData.createdAt,
          exchangeYear: reportData.exchangeYear,
          exchangeSemester: reportData.exchangeSemester,
          viewCount: reportData.viewCount || 0,
          likeCount: reportData.likeCount || 0,
          isLiked: true,
          school: {
            id: reportData.schoolId._id.toString(),
            name: reportData.schoolId.name,
            name_kor: reportData.schoolId.name_kor,
            city: reportData.schoolId.city || '',
            toefl: reportData.schoolId.toefl || 0,
            ielts: reportData.schoolId.ielts || 0,
            minCompletedSemester: reportData.schoolId.minCompletedSemester || 0,
            availableSemester: reportData.schoolId.availableSemester || '',
            hasDormitory: reportData.schoolId.hasDormitory || false,
            country: reportData.schoolId.countryId?.name ?? null,
            continent: reportData.schoolId.countryId?.continentId?.name ?? null,
          },
        };
      });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      savedReports: formattedReports,
      savedReportsCount: formattedReports.length,
    };
  }
}
