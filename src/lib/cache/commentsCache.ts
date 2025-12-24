// Simple in-memory cache for comments
const commentsCache = new Map<
  string,
  {
    data: any[];
    timestamp: number;
  }
>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const commentsCacheManager = {
  get(postId: string) {
    const cached = commentsCache.get(postId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > CACHE_DURATION) {
      commentsCache.delete(postId);
      return null;
    }

    return cached.data;
  },

  set(postId: string, data: any[]) {
    commentsCache.set(postId, {
      data,
      timestamp: Date.now(),
    });
  },

  invalidate(postId: string) {
    commentsCache.delete(postId);
  },

  clear() {
    commentsCache.clear();
  },
};
