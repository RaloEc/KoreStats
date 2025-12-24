// Simple in-memory cache for activity feed
const feedCache = new Map<
  string,
  {
    data: any[];
    timestamp: number;
    page: number;
  }
>();

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

export const feedCacheManager = {
  get(profileId: string) {
    const cached = feedCache.get(profileId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > CACHE_DURATION) {
      feedCache.delete(profileId);
      return null;
    }

    return { data: cached.data, page: cached.page };
  },

  set(profileId: string, data: any[], page: number) {
    feedCache.set(profileId, {
      data,
      timestamp: Date.now(),
      page,
    });
  },

  append(profileId: string, newData: any[], page: number) {
    const cached = feedCache.get(profileId);
    if (cached) {
      cached.data = [...cached.data, ...newData];
      cached.page = page;
      cached.timestamp = Date.now();
    }
  },

  invalidate(profileId: string) {
    feedCache.delete(profileId);
  },

  clear() {
    feedCache.clear();
  },
};
