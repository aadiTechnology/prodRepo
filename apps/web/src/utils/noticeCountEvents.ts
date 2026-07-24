/** Cross-component refresh for Notice sidebar count badge. */

export const NOTICE_COUNT_CHANGED_EVENT = "notice-count-changed";

export type NoticeUnreadFilters = {
  audienceType?: string | null;
  noticeType?: string | null;
  status?: string | null;
};

/**
 * Refresh sidebar Communication badge (not-read count).
 * - Omit `filters` to refetch with whatever filters are already sticky.
 * - Pass `{}` to clear list filters (e.g. leaving Notice list).
 * - Pass status/audience/type to narrow the badge while list filters are active.
 */
export function notifyNoticeCountChanged(filters?: NoticeUnreadFilters): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTICE_COUNT_CHANGED_EVENT, {
      detail: filters,
    })
  );
}
