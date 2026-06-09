import { apiBaseUrl } from "../config";

/** Resolve API-hosted media paths, data URLs, or same-origin absolute URLs for display. */
export function toMediaUrl(path?: string | null): string | undefined {
  if (!path || typeof path !== "string") return undefined;
  if (path.startsWith("data:image/")) return path;

  if (path.startsWith("http")) {
    try {
      const url = new URL(path);
      const base = new URL(apiBaseUrl);
      if (url.origin !== base.origin) return undefined;
      return path;
    } catch {
      return undefined;
    }
  }

  if (!path.startsWith("/") || path.includes("..") || path.includes("//")) return undefined;

  const root = apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${root}${path}`;
}
