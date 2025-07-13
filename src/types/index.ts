import { Types } from 'mongoose';

// 기본 MongoDB 문서 타입
export interface BaseType {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// 대륙 타입
export interface ContinentType extends BaseType {
  name: string;
}

// 국가 타입
export interface CountryType extends BaseType {
  name: string;
  continentId: Types.ObjectId | ContinentType;
}

// 학교 타입
export interface SchoolType extends BaseType {
  countryId: Types.ObjectId | CountryType;
  name: string;
  name_kor: string;
  minCompletedSemester: number;
  toefl: number;
  ielts: number;
  availableSemester: '한 학기만 파견' | '한 학기 파견 후 연장';
  qsRank?: number;
  hasDormitory: boolean;
  city?: string;
  personnel?: number;
  homepageUrl?: string;
  minGpa?: number;
  language_remarks?: string;
}

// 보고서 타입
export interface ReportType extends BaseType {
  schoolId: Types.ObjectId | SchoolType;
  exchangeYear: number;
  exchangeSemester: '1학기' | '2학기';
  content: {
    applicationProcess?: string;
    visaProcess?: string;
    schoolEnvironment?: string;
    classes?: string;
    accommodationMeals?: string;
    facilitiesPrograms?: string;
    internationalOffice?: string;
    livingTips?: string;
  };
  hashtags: string[];
  viewCount: number;
  likeCount: number;
  likedUsers: Types.ObjectId[];
}

// 정렬 타입
export interface SortOptions {
  [key: string]: 1 | -1;
}

// Pagination 타입
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// 일반적인 페이지네이션 응답 타입
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}
