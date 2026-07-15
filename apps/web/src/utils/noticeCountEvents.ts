/** Cross-component refresh for Notice sidebar count badge. */

export const NOTICE_COUNT_CHANGED_EVENT = "notice-count-changed";

export function notifyNoticeCountChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTICE_COUNT_CHANGED_EVENT));
}
