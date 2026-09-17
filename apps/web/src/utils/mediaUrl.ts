import { apiBaseUrl } from "../config";

const TRUSTED_CLOUD_HOST_SUFFIXES = [
  "backblazeb2.com",
  "blob.core.windows.net",
];

function isTrustedAbsoluteMediaUrl(path: string): boolean {
  try {
    const url = new URL(path);
    const base = new URL(apiBaseUrl);
    if (url.origin === base.origin) return true;
    const host = url.hostname.toLowerCase();
    return TRUSTED_CLOUD_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

/** Resolve API-hosted media paths, data URLs, or trusted cloud download URLs for display. */
export function toMediaUrl(path?: string | null): string | undefined {
  if (!path || typeof path !== "string") return undefined;
  if (path.startsWith("data:image/")) return path;

  if (path.startsWith("http")) {
    return isTrustedAbsoluteMediaUrl(path) ? path : undefined;
  }

  if (!path.startsWith("/") || path.includes("..") || path.includes("//")) return undefined;

  const root = apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${root}${path}`;
}
