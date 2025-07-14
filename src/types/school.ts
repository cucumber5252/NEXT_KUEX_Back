// types/schoolts
import { Types } from 'mongoose';

export type SchoolWithCountry = {
  _id: string;
  name: string;
  name_kor: string;
  city: string;
  minGpa: number;
  minCompletedSemester: number;
  toefl: number;
  iets: number;
  availableSemester: string;
  hasDormitory: boolean;
  homepageUrl: string;
  qsRank: number;
  personnel: number;
  language_remarks?: string;
  countryId?: {
    name: string;
    continentId?: {
      name: string;
    };
  };
};

// 학교 필터 타입
export interface SchoolFilter {
  minCompletedSemester?: { $gte: number };
  toefl?: { $gte: number } | { $lte: number };
  iets?: { $gte: number } | { $lte: number };
  availableSemester?: string | null;
  hasDormitory?: boolean;
  countryId?: Types.ObjectId | { $in: Types.ObjectId[] };
}

export interface SchoolResponse {
  id: string;
  name: string;
  name_kor: string;
  continent: string;
  country: string;
  city?: string;
  minCompletedSemester: number;
  toefl: number;
  iets: number;
  availableSemester: string;
  hasDormitory: boolean;
  qsRank?: number;
  personnel?: number;
  homepageUrl?: string;
  minGpa?: number;
  language_remarks?: string;
}
