import { QueryClient } from "@tanstack/react-query";
import type { BugFilters } from "./adminApi";

/**
 * Phase P — frontend caching layer.
 *
 * Replaces the per-screen `useEffect` + `useState` + `setRows(null)`
 * pattern that was forcing a fresh edge-function call on every
 * navigation and blanking the table while the response was in flight.
 *
 * `staleTime: 30_000` means a screen revisit within 30 seconds renders
 * cached data immediately and skips the network entirely.  After 30s
 * the cached data still renders instantly while react-query refetches
 * in the background — the user never sees a blank table on revisit.
 *
 * `gcTime: 5min` matches the backend auth cache TTL.  When both expire
 * together the next request is genuinely fresh.
 *
 * `refetchOnWindowFocus: false` because the admin SPA is single-tab and
 * the focus-refetch default is too noisy for our usage (every alt-tab
 * issued a fresh query).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Query key factory.  Single source of truth so mutations can invalidate
 * by reference instead of typing string arrays inline (and getting it
 * subtly wrong).
 *
 * Convention: list keys use the bare collection name; detail keys
 * append the id; sub-resource keys use a third segment (e.g. park
 * reports vs park itself).
 */
export const qk = {
  overview: () => ["overview"] as const,
  parks: () => ["parks"] as const,
  park: (id: string) => ["park", id] as const,
  parkReports: (id: string) => ["park", id, "reports"] as const,
  users: () => ["users"] as const,
  user: (id: string) => ["user", id] as const,
  reports: () => ["reports"] as const,
  report: (id: number) => ["report", id] as const,
  feedback: () => ["feedback"] as const,
  feedbackItem: (id: number) => ["feedback", id] as const,
  bugs: (filters?: BugFilters) =>
    ["bugs", filters ?? {}] as const,
  bug: (id: string) => ["bug", id] as const,
} as const;
