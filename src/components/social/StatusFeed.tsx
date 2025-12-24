import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import CreateStatus from "./CreateStatus";
import ActivityItem from "./ActivityItem";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { feedCacheManager } from "@/lib/cache/feedCache";

interface StatusFeedProps {
  profileId: string;
  profileUsername?: string; // Username of the profile being viewed
  isOwnProfile?: boolean;
}

// Skeleton component for loading state
const ActivitySkeleton = () => (
  <div className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-white/5 rounded-xl p-4 mb-4 animate-pulse">
    <div className="flex items-start gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10" />
      <div className="flex-1">
        <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded mb-2" />
        <div className="h-3 w-16 bg-gray-200 dark:bg-white/10 rounded" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 w-full bg-gray-200 dark:bg-white/10 rounded" />
      <div className="h-4 w-3/4 bg-gray-200 dark:bg-white/10 rounded" />
    </div>
  </div>
);

export default function StatusFeed({
  profileId,
  profileUsername,
  isOwnProfile,
}: StatusFeedProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const initialLoadDone = useRef(false);
  const lastProfileId = useRef(profileId);

  const fetchPosts = useCallback(
    async (
      currentPage: number,
      append: boolean = false,
      skipCache: boolean = false
    ) => {
      // Check cache first (only for initial load)
      if (!append && !skipCache) {
        const cached = feedCacheManager.get(profileId);
        if (cached) {
          setPosts(cached.data);
          setPage(cached.page);
          setHasMore(cached.data.length >= 5); // Assume more if we have items
          setLoading(false);
          return;
        }
      }

      try {
        // Fetch both endpoints in parallel for better performance
        const [postsRes, activitiesRes] = await Promise.all([
          fetch(
            `/api/social/posts?profileId=${profileId}&page=${currentPage}&limit=5`
          ),
          fetch(
            `/api/perfil/actividades?userId=${profileId}&page=${currentPage}&limit=5`
          ),
        ]);

        // Handle responses
        const postsData = postsRes.ok
          ? await postsRes.json()
          : { posts: [], meta: { hasMore: false } };
        const activitiesData = activitiesRes.ok
          ? await activitiesRes.json()
          : { items: [], hasMore: false };

        // Transform social posts to match activity format
        const socialPostsAsActivities = (postsData.posts || []).map(
          (post: any) => ({
            ...post,
            type: "social_post",
            timestamp: post.created_at,
          })
        );

        // Combine both arrays
        const combined = [
          ...socialPostsAsActivities,
          ...(activitiesData.items || []),
        ];

        // Sort by timestamp descending
        combined.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        if (append) {
          setPosts((prev) => {
            const newPosts = [...prev, ...combined];
            // Cache the updated data
            feedCacheManager.set(profileId, newPosts, currentPage);
            return newPosts;
          });
        } else {
          setPosts(combined);
          // Cache the data
          feedCacheManager.set(profileId, combined, currentPage);
        }

        // Determine if there are more items
        const hasMorePosts = postsData.meta?.hasMore || false;
        const hasMoreActivities = activitiesData.hasMore || false;
        setHasMore(hasMorePosts || hasMoreActivities);
      } catch (error) {
        console.error(error);
        // Don't show error toast on initial load, just set empty
        if (!append) {
          setPosts([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [profileId]
  );

  useEffect(() => {
    // Check if profileId changed
    if (lastProfileId.current !== profileId) {
      lastProfileId.current = profileId;
      initialLoadDone.current = false;
      setLoading(true);
      setPage(1);
    }

    // Only load on mount or when profileId actually changes
    if (!initialLoadDone.current) {
      fetchPosts(1);
      initialLoadDone.current = true;
    }
  }, [profileId, fetchPosts]);

  const handlePostCreated = useCallback(() => {
    // Invalidate cache and refresh
    feedCacheManager.invalidate(profileId);
    setLoading(true);
    fetchPosts(1, false, true);
  }, [profileId, fetchPosts]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  }, [loadingMore, hasMore, page, fetchPosts]);

  const handleDeletePost = useCallback(
    (postId: string) => {
      // Optimistic delete
      setPosts((prev) => {
        const newPosts = prev.filter((p) => p.id !== postId);
        // Update cache
        feedCacheManager.set(profileId, newPosts, page);
        return newPosts;
      });
    },
    [profileId, page]
  );

  // Memoize activity items to prevent unnecessary re-renders
  const activityItems = useMemo(
    () =>
      posts.map((activity) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          onDelete={handleDeletePost}
        />
      )),
    [posts, handleDeletePost]
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Always show CreateStatus - it handles auth internally */}
        <CreateStatus
          targetUserId={profileId}
          targetUsername={profileUsername}
          onPostCreated={handlePostCreated}
        />
        {/* Skeleton loading */}
        <ActivitySkeleton />
        <ActivitySkeleton />
        <ActivitySkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Always show CreateStatus - it handles auth internally */}
      <CreateStatus
        targetUserId={profileId}
        targetUsername={profileUsername}
        onPostCreated={handlePostCreated}
      />

      <div className="space-y-4">
        {activityItems}

        {posts.length === 0 && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <p>No hay actividad reciente.</p>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-sm text-pink-500 dark:text-pink-400 hover:text-pink-600 dark:hover:text-pink-300 disabled:opacity-50 transition-colors"
            >
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando...
                </span>
              ) : (
                "Cargar más"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
