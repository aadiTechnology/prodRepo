const PREVIOUS_LOGIN_KEY = "sk_previous_login";
const CURRENT_LOGIN_KEY = "sk_current_login";

const key = (prefix: string, userId: number) => `${prefix}_${userId}`;

/** Call after a successful login; returns the previous session timestamp (ISO), if any. */
export function recordUserLogin(userId: number): string | null {
  const prevKey = key(PREVIOUS_LOGIN_KEY, userId);
  const curKey = key(CURRENT_LOGIN_KEY, userId);
  const previous = localStorage.getItem(curKey);
  const now = new Date().toISOString();
  if (previous) {
    localStorage.setItem(prevKey, previous);
  }
  localStorage.setItem(curKey, now);
  return previous;
}

export function getPreviousLoginIso(userId: number): string | null {
  return localStorage.getItem(key(PREVIOUS_LOGIN_KEY, userId));
}

export function formatLastLoginLabel(iso: string | null): string {
  if (!iso) return "First session on this device";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)  return "Just now";
  if (diffMin < 60)  return `${diffMin} min ago`;
  if (diffHr  < 24)  return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay <  7)  return `${diffDay} days ago`;

  // older than a week — show a proper date+time
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
