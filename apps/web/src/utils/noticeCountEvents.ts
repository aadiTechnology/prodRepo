/** Cross-component refresh for Notice sidebar count badge. */

export const NOTICE_COUNT_CHANGED_EVENT = "notice-count-changed";

export type NoticeUnreadFilters = {
  audienceType?: string | null;
  noticeType?: string | null;
  status?: string | null;
};

export function notifyNoticeCountChanged(filters?: NoticeUnreadFilters): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTICE_COUNT_CHANGED_EVENT, {
      detail: filters ?? {},
    })
  );
}
