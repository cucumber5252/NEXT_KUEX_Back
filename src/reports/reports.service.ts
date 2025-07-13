// 전체 코드 - 각주 포함
import { Injectable, BadRequestException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId, Types } from 'mongoose';
import { Report } from 'src/schemas/report.schema';
import { School } from 'src/schemas/school.schema';
import { Country } from 'src/schemas/country.schema';
import { Continent } from 'src/schemas/continent.schema';
import {
  getRedisClient,
  cacheKeys,
  cacheTTL,
  getUserLikedReports,
  cacheUserLikedReports,
  addUserLikeToCache,
  removeUserLikeFromCache,
} from 'src/lib/redis';
import {
  ReportType,
  SchoolType,
  CountryType,
  ContinentType,
  SortOptions,
  PaginatedResponse,
} from 'src/types';
import {
  ReportDetail,
  ReportWithSchool,
  ReportResponseItem,
} from 'src/types/report';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '');

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<Report>,
    @InjectModel(School.name) private schoolModel: Model<School>,
    @InjectModel(Country.name) private countryModel: Model<Country>,
    @InjectModel(Continent.name) private continentModel: Model<Continent>,
  ) {}

  // 보고서 목록 조회 (검색, 필터링, 캐싱 포함)
  async getReports(req: FastifyRequest) {
    const redis = getRedisClient();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const searchParams = url.searchParams;

    // 쿼리 파라미터 해석
    const includeContent = searchParams.get('includeContent') === 'true';
    const schoolsOnly = searchParams.get('schoolsOnly') === 'true';
    const searchQuery = searchParams.get('search');
    const userId = searchParams.get('userId');
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get('limit')) || 12),
    );
    const sortType = searchParams.get('sort') || 'latest';

    const filters = {
      search: searchQuery,
      includeContent,
      schoolsOnly,
      sort: sortType,
      continent: searchParams.get('continent'),
      country: searchParams.get('country'),
      schoolId: searchParams.get('schoolId'),
      toefl: searchParams.get('toefl'),
      ielts: searchParams.get('ielts'),
      minCompletedSemester: searchParams.get('minCompletedSemester'),
      availableSemester: searchParams.get('availableSemester'),
      hasDormitory: searchParams.get('hasDormitory'),
    };

    const cacheKey = cacheKeys.reports(page, limit, filters);
    let baseData: PaginatedResponse<ReportResponseItem> | null = null;
    try {
      baseData = await redis.get(cacheKey);
      if (baseData) {
        console.log('베이스 데이터 캐시에서 조회:', cacheKey);

        // 사용자별 좋아요 정보 추가
        if (userId && baseData.data) {
          const userLikedReports = await getUserLikedReports(userId);
          baseData.data = baseData.data.map((report) => ({
            ...report,
            isLiked: userLikedReports.has(report.id),
          }));
        } else if (baseData.data) {
          // userId가 없으면 모든 isLiked를 false로 설정
          baseData.data = baseData.data.map((report) => ({
            ...report,
            isLiked: false,
          }));
        }

        return baseData;
      }
    } catch (e) {
      console.warn('캐시 조회 실패', e);
    }

    // schoolsOnly 모드 - 필터 사이드바용 학교 메타데이터만 반환
    if (schoolsOnly) {
      const schoolsCacheKey = cacheKeys.reportSchools();
      const cachedSchools = await redis.get(schoolsCacheKey);
      if (cachedSchools) return cachedSchools;

      const schoolsData = await this.reportModel.aggregate([
        { $group: { _id: '$schoolId', schoolId: { $first: '$schoolId' } } },
        {
          $lookup: {
            from: 'schools',
            localField: 'schoolId',
            foreignField: '_id',
            as: 'school',
          },
        },
        { $unwind: '$school' },
        {
          $lookup: {
            from: 'countries',
            localField: 'school.countryId',
            foreignField: '_id',
            as: 'country',
          },
        },
        { $unwind: '$country' },
        {
          $lookup: {
            from: 'continents',
            localField: 'country.continentId',
            foreignField: '_id',
            as: 'continent',
          },
        },
        { $unwind: '$continent' },
        {
          $project: {
            _id: 0,
            id: '$school._id',
            name: '$school.name',
            country: '$country.name',
            continent: '$continent.name',
          },
        },
        { $sort: { continent: 1, country: 1, name: 1 } },
      ]);

      await redis.setex(schoolsCacheKey, cacheTTL.reportSchools, schoolsData);
      console.log('학교 메타데이터 캐시에 저장됨:', schoolsCacheKey);
      return schoolsData;
    }

    // 검색/필터 조건 구성
    const skip = (page - 1) * limit;
    const sortMap: Record<string, SortOptions> = {
      latest: { exchangeYear: -1, exchangeSemester: -1, createdAt: -1 },
      oldest: { exchangeYear: 1, exchangeSemester: 1, createdAt: 1 },
      popular: { likeCount: -1 },
    };

    const searchFilter: any = {};
    if (searchQuery?.trim()) {
      const q = searchQuery.trim();
      searchFilter.$or = [
        { hashtags: { $regex: q, $options: 'i' } },
        { 'content.applicationProcess': { $regex: q, $options: 'i' } },
        { 'content.visaProcess': { $regex: q, $options: 'i' } },
        { 'content.schoolEnvironment': { $regex: q, $options: 'i' } },
        { 'content.classes': { $regex: q, $options: 'i' } },
        { 'content.accommodationMeals': { $regex: q, $options: 'i' } },
        { 'content.facilitiesPrograms': { $regex: q, $options: 'i' } },
        { 'content.internationalOffice': { $regex: q, $options: 'i' } },
        { 'content.livingTips': { $regex: q, $options: 'i' } },
      ];
    }

    // 학교 필터링 처리
    const schoolFilter: any = {};
    if (searchParams.get('minCompletedSemester')) {
      schoolFilter.minCompletedSemester = {
        $gte: Number(searchParams.get('minCompletedSemester')),
      };
    }
    if (searchParams.get('toefl')) {
      schoolFilter.toefl = { $lte: Number(searchParams.get('toefl')) };
    }
    if (searchParams.get('ielts')) {
      schoolFilter.ielts = { $lte: Number(searchParams.get('ielts')) };
    }
    if (searchParams.get('availableSemester')) {
      schoolFilter.availableSemester = searchParams.get('availableSemester');
    }
    if (searchParams.get('hasDormitory')) {
      schoolFilter.hasDormitory = searchParams.get('hasDormitory') === 'true';
    }

    const directSchoolId = searchParams.get('schoolId');
    const continentName = searchParams.get('continent');
    const countryName = searchParams.get('country');

    if (directSchoolId) {
      searchFilter.schoolId = directSchoolId;
    } else {
      if (countryName) {
        const country = await this.countryModel.findOne({ name: countryName });
        if (country) schoolFilter.countryId = country._id;
      } else if (continentName) {
        const continent = await this.continentModel.findOne({
          name: continentName,
        });
        if (continent) {
          const countries = await this.countryModel.find({
            continentId: continent._id,
          });
          const countryIds = countries.map((c) => c._id);
          schoolFilter.countryId = { $in: countryIds };
        }
      }

      if (Object.keys(schoolFilter).length > 0) {
        const matchedSchools = await this.schoolModel.find(schoolFilter, '_id');
        const matchedIds = matchedSchools.map((s) => s._id.toString());
        if (matchedIds.length === 0) {
          console.log('학교 필터 결과: 일치하는 학교 없음 → 빈 배열 반환');
          const emptyResponse: PaginatedResponse<never> = {
            data: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: limit,
              hasNextPage: false,
              hasPrevPage: false,
            },
          };
          return emptyResponse;
        }
        searchFilter.schoolId = { $in: matchedIds };
      }
    }

    // Report 쿼리 실행
    const totalItems = await this.reportModel.countDocuments(searchFilter);
    const reports = await this.reportModel
      .find(searchFilter)
      .populate({
        path: 'schoolId',
        populate: { path: 'countryId', populate: { path: 'continentId' } },
      })
      .sort(sortMap[sortType] ?? { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    //응답 데이터 구성
    const response = reports.map((r) => {
      const report = r as unknown as ReportType & {
        schoolId: SchoolType & {
          countryId: CountryType & { continentId: ContinentType };
        };
      };

      const school = report.schoolId;
      const country = school?.countryId;
      const continent = country?.continentId;

      return {
        id: report._id.toString(),
        hashtags: report.hashtags,
        createdAt: report.createdAt,
        exchangeYear: report.exchangeYear,
        exchangeSemester: report.exchangeSemester,
        viewCount: report.viewCount ?? 0,
        likeCount: report.likeCount ?? 0,
        isLiked: userId
          ? report.likedUsers?.some((u) => u.toString() === userId)
          : false,
        school: {
          id: school._id.toString(),
          name: school.name,
          name_kor: school.name_kor,
          city: school.city,
          toefl: school.toefl,
          ielts: school.ielts,
          minCompletedSemester: school.minCompletedSemester,
          availableSemester: school.availableSemester,
          hasDormitory: school.hasDormitory,
          country: country?.name,
          continent: continent?.name,
        },
        ...(includeContent
          ? {
              content: {
                applicationProcess: report.content?.applicationProcess ?? '',
                visaProcess: report.content?.visaProcess ?? '',
                schoolEnvironment: report.content?.schoolEnvironment ?? '',
                classes: report.content?.classes ?? '',
                accommodationMeals: report.content?.accommodationMeals ?? '',
                facilitiesPrograms: report.content?.facilitiesPrograms ?? '',
                internationalOffice: report.content?.internationalOffice ?? '',
                livingTips: report.content?.livingTips ?? '',
              },
            }
          : {}),
      };
    });

    // 페이지네이션 응답 구성
    const paginated: PaginatedResponse<(typeof response)[0]> = {
      data: response,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page * limit < totalItems,
        hasPrevPage: page > 1,
      },
    };

    // 캐시 저장 및 좋아요 정보 캐시
    await redis.setex(cacheKey, cacheTTL.reports, paginated);
    console.log('전체 결과 베이스 데이터 캐시에 저장됨:', cacheKey);

    // 사용자별 좋아요 정보 수집 및 캐시
    if (userId) {
      const likedReportIds: string[] = [];
      reports.forEach((report) => {
        const reportWithUsers = report as unknown as ReportType;
        if (
          reportWithUsers.likedUsers &&
          reportWithUsers.likedUsers.some((id) => id.toString() === userId)
        ) {
          likedReportIds.push(reportWithUsers._id.toString());
        }
      });

      if (likedReportIds.length > 0) {
        await cacheUserLikedReports(userId, likedReportIds);
        console.log(
          `사용자 ${userId}의 좋아요 정보 캐시됨: ${likedReportIds.length}개`,
        );
      }
    }

    return paginated;
  }

  async getReportById(
    id: string,
    req: FastifyRequest,
  ): Promise<ReportDetail | { error: string }> {
    if (!isValidObjectId(id)) {
      return { error: '해당 보고서 정보를 찾을 수 없습니다.' };
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');

    let updatedReport: ReportWithSchool | null;
    try {
      updatedReport = (await this.reportModel
        .findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true })
        .populate({
          path: 'schoolId',
          populate: {
            path: 'countryId',
            populate: { path: 'continentId' },
          },
        })
        .lean()) as unknown as ReportWithSchool;
    } catch {
      updatedReport = (await this.reportModel
        .findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true })
        .populate({
          path: 'schoolId',
          populate: {
            path: 'countryId',
            populate: { path: 'continentId' },
          },
        })
        .lean()) as unknown as ReportWithSchool;
    }

    if (!updatedReport) {
      return { error: '해당 보고서 정보를 찾을 수 없습니다.' };
    }

    const isLiked =
      Array.isArray(updatedReport.likedUsers) &&
      userId &&
      isValidObjectId(userId)
        ? updatedReport.likedUsers.some((uid) => uid.toString() === userId)
        : false;

    const school = updatedReport.schoolId;
    const country = school?.countryId;
    const continent = country?.continentId;

    return {
      id: updatedReport._id.toString(),
      school: {
        id: school._id.toString(),
        name: school.name,
        name_kor: school.name_kor ?? undefined,
        city: school.city ?? '',
        continent: continent?.name ?? '',
        country: country?.name ?? '',
        minCompletedSemester: school.minCompletedSemester,
        toefl: school.toefl,
        ielts: school.ielts,
        availableSemester: school.availableSemester,
        hasDormitory: school.hasDormitory,
      },
      exchangeYear: updatedReport.exchangeYear,
      exchangeSemester: updatedReport.exchangeSemester,
      content: updatedReport.content,
      hashtags: updatedReport.hashtags,
      viewCount: updatedReport.viewCount,
      likeCount: updatedReport.likeCount,
      isLiked,
      createdAt: updatedReport.createdAt,
      updatedAt: updatedReport.updatedAt,
    };
  }

  // 좋아요 토글
  async toggleLike(id: string, req: FastifyRequest) {
    const redis = getRedisClient();

    if (!isValidObjectId(id))
      return { error: '유효하지 않은 보고서 ID입니다.' };

    const token = req.cookies['auth-token'];
    if (!token) return { error: '인증이 필요합니다.' };

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userId = payload.userId as string;
    } catch {
      return { error: '유효하지 않은 토큰입니다.' };
    }

    if (!userId || !isValidObjectId(userId)) {
      return { error: '유효한 사용자 인증이 필요합니다.' };
    }

    const report = await this.reportModel.findById(id, 'likedUsers likeCount');
    if (!report) return { error: '해당 보고서를 찾을 수 없습니다.' };

    const isCurrentlyLiked = report.likedUsers.some(
      (uid: Types.ObjectId) => uid.toString() === userId,
    );

    let updatedReport;
    if (isCurrentlyLiked) {
      updatedReport = await this.reportModel.findByIdAndUpdate(
        id,
        { $pull: { likedUsers: userId }, $inc: { likeCount: -1 } },
        { new: true, select: 'likeCount' },
      );
    } else {
      updatedReport = await this.reportModel.findByIdAndUpdate(
        id,
        { $addToSet: { likedUsers: userId }, $inc: { likeCount: 1 } },
        { new: true, select: 'likeCount' },
      );
    }

    // 캐시 동기화
    try {
      if (!isCurrentlyLiked) {
        await addUserLikeToCache(userId, id);
      } else {
        await removeUserLikeFromCache(userId, id);
      }

      const reportKeys = await redis.keys('reports:*');
      if (reportKeys.length > 0) {
        await redis.del(...reportKeys);
        console.log(`리포트 목록 캐시 ${reportKeys.length}개 무효화`);
      }
    } catch (cacheError) {
      console.warn('좋아요 캐시 업데이트 실패:', cacheError);
    }

    return {
      success: true,
      isLiked: !isCurrentlyLiked,
      likeCount: updatedReport?.likeCount || 0,
    };
  }

  // 좋아요 상태 확인
  async getLikeStatus(id: string, req: FastifyRequest) {
    if (!isValidObjectId(id))
      return { error: '유효하지 않은 보고서 ID입니다.' };

    const token = req.cookies['auth-token'];
    if (!token) return { error: '인증이 필요합니다.' };

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userId = payload.userId as string;
    } catch {
      return { error: '유효하지 않은 토큰입니다.' };
    }

    if (!userId || !isValidObjectId(userId)) {
      return { error: '유효한 사용자 ID가 필요합니다.' };
    }

    // 사용자별 좋아요 캐시에서 먼저 확인 -> DB 조회
    let isLiked: boolean;
    try {
      const userLikedReports = await getUserLikedReports(userId);
      if (userLikedReports.size > 0) {
        isLiked = userLikedReports.has(id);
      } else {
        // 캐시에서 없으면 DB에서 조회
        const report = await this.reportModel.findById(id, 'likedUsers');
        if (!report) return { error: '해당 보고서를 찾을 수 없습니다.' };
        isLiked = report.likedUsers.some(
          (uid: Types.ObjectId) => uid.toString() === userId,
        );
      }
    } catch {
      const report = await this.reportModel.findById(id, 'likedUsers');
      if (!report) return { error: '해당 보고서를 찾을 수 없습니다.' };
      isLiked = report.likedUsers.some(
        (uid: Types.ObjectId) => uid.toString() === userId,
      );
    }

    const report = await this.reportModel.findById(id, 'likeCount');
    if (!report) return { error: '해당 보고서를 찾을 수 없습니다.' };

    return {
      success: true,
      likeCount: report.likeCount,
      isLiked,
    };
  }
}
