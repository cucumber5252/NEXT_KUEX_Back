import { ReportRedisFilters } from 'src/types/report';

import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      throw new Error('Redis 환경변수가 설정되지 않았습니다.');
    }

    redisInstance = new Redis({ url, token });
  }

  return redisInstance;
}

function createFilterHash(filters: ReportRedisFilters): string {
  const sortedKeys = Object.keys(filters).sort();
  const normalizedFilters: Record<string, string | boolean | null> = {};

  for (const key of sortedKeys) {
    const value = filters[key as keyof ReportRedisFilters];
    normalizedFilters[key] =
      value === null || value === undefined ? null : value;
  }

  const filterString = JSON.stringify(normalizedFilters);
  return createHash('md5').update(filterString).digest('hex').substring(0, 12);
}

export const cacheKeys = {
  reports: (page: number, limit: number, filters: ReportRedisFilters) => {
    const filterHash = createFilterHash(filters);
    return `reports:${page}:${limit}:${filterHash}`;
  },
  reportSchools: () => `reports:schools:meta`,
  userLikes: (userId: string) => `user:${userId}:likes`,
  report: (id: string) => `report:${id}`,
  schools: (filters?: string) => `schools:${filters || 'all'}`,
  school: (id: string) => `school:${id}`,
};

export const cacheTTL = {
  reports: 60 * 30, // 30 minutes
  reportSchools: 60 * 60 * 24, // 24 hours
  userLikes: 60 * 60 * 2, // 2 hours
  report: 60 * 60, // 1 hour
  schools: 60 * 60 * 24, // 24 hours
  school: 60 * 60 * 2, // 2 hours
};

export async function getUserLikedReports(
  userId: string,
): Promise<Set<string>> {
  const redis = getRedisClient();
  try {
    const cacheKey = cacheKeys.userLikes(userId);
    const likedReports = await redis.smembers(cacheKey);
    return new Set(likedReports as string[]);
  } catch (error) {
    console.warn('사용자 좋아요 캐시 조회 실패:', error);
    return new Set();
  }
}

export async function cacheUserLikedReports(
  userId: string,
  reportIds: string[],
): Promise<void> {
  const redis = getRedisClient();
  try {
    const cacheKey = cacheKeys.userLikes(userId);
    if (reportIds.length > 0) {
      await redis.sadd(cacheKey, ...(reportIds as [string, ...string[]]));
      await redis.expire(cacheKey, cacheTTL.userLikes);
    }
  } catch (error) {
    console.warn('사용자 좋아요 캐시 저장 실패:', error);
  }
}

export async function addUserLikeToCache(
  userId: string,
  reportId: string,
): Promise<void> {
  const redis = getRedisClient();
  try {
    const cacheKey = cacheKeys.userLikes(userId);
    await redis.sadd(cacheKey, reportId);
    await redis.expire(cacheKey, cacheTTL.userLikes);
  } catch (error) {
    console.warn('사용자 좋아요 캐시 추가 실패:', error);
  }
}

export async function removeUserLikeFromCache(
  userId: string,
  reportId: string,
): Promise<void> {
  const redis = getRedisClient();
  try {
    const cacheKey = cacheKeys.userLikes(userId);
    await redis.srem(cacheKey, reportId);
  } catch (error) {
    console.warn('사용자 좋아요 캐시 제거 실패:', error);
  }
}

export { createFilterHash };
