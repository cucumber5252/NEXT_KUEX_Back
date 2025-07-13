// interfaces/report.ts
import { SchoolWithCountry } from 'src/types/school';

// 보고서 콘텐츠 타입
export interface ReportContent {
  applicationProcess: string;
  visaProcess: string;
  schoolEnvironment: string;
  classes: string;
  accommodationMeals: string;
  facilitiesPrograms: string;
  internationalOffice: string;
  livingTips: string;
}

// 기본 보고서 타입 (populate 없음)
export interface Report {
  _id: string;
  schoolId: string;
  exchangeYear: number;
  exchangeSemester: string;
  content: ReportContent;
  hashtags: string[];
  viewCount: number;
  likeCount: number;
  likedUsers: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 학교 정보가 populate된 보고서 타입
export interface ReportWithSchool {
  _id: string;
  schoolId: SchoolWithCountry;
  exchangeYear: number;
  exchangeSemester: string;
  content: ReportContent;
  hashtags: string[];
  viewCount: number;
  likeCount: number;
  likedUsers: string[];
  createdAt: Date;
  updatedAt: Date;
}

// API 응답용 타입 (목록 조회)
export interface ReportListItem {
  id: string;
  hashtags: string[];
  createdAt: Date;
  exchangeYear: number;
  exchangeSemester: string;
  viewCount: number;
  likeCount: number;
  isLiked?: boolean;
  school: {
    id: string;
    name: string;
    name_kor: string;
    city: string;
    toefl: number;
    ielts: number;
    minCompletedSemester: number;
    availableSemester: string;
    hasDormitory: boolean;
    country: string | null;
    continent: string | null;
  };
}

// API 응답용 타입 (개별 조회)
export interface ReportDetail {
  id: string;
  school: {
    id: string;
    name: string;
    name_kor?: string;
    city: string;
    continent: string;
    country: string;
    minCompletedSemester: number;
    toefl: number;
    ielts: number;
    availableSemester: string;
    hasDormitory: boolean;
  };
  exchangeYear: number;
  exchangeSemester: string;
  content: ReportContent;
  hashtags: string[];
  viewCount: number;
  likeCount: number;
  isLiked?: boolean; // 현재 사용자가 좋아요를 눌렀는지 여부
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportResponse {
  id: string;
  hashtags: string[];
  createdAt: Date;
  exchangeYear: number;
  exchangeSemester: string;
  viewCount: number;
  likeCount: number;
  isLiked?: boolean;
  school: {
    id: string;
    name: string;
    name_kor: string;
    city?: string;
    toefl: number;
    ielts: number;
    minCompletedSemester: number;
    availableSemester: string;
    hasDormitory: boolean;
    country: string | null;
    continent: string | null;
  };
}

export interface ReportResponseItem {
  id: string;
  hashtags: string[];
  createdAt: Date;
  exchangeYear: number;
  exchangeSemester: string;
  viewCount: number;
  likeCount: number;
  isLiked?: boolean;
  school: {
    id: string;
    name: string;
    name_kor: string;
    city: string;
    toefl: number;
    ielts: number;
    minCompletedSemester: number;
    availableSemester: string;
    hasDormitory: boolean;
    country: string | null;
    continent: string | null;
  };
  content?: {
    applicationProcess: string;
    visaProcess: string;
    schoolEnvironment: string;
    classes: string;
    accommodationMeals: string;
    facilitiesPrograms: string;
    internationalOffice: string;
    livingTips: string;
  };
}

export interface ReportRedisFilters {
  search?: string | null;
  includeContent?: boolean;
  schoolsOnly?: boolean;
  sort?: string;
  continent?: string | null;
  country?: string | null;
  schoolId?: string | null;
  toefl?: string | null;
  ielts?: string | null;
  minCompletedSemester?: string | null;
  availableSemester?: string | null;
  hasDormitory?: string | null;
}
