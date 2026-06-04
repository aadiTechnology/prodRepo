/**
 * Browser host helpers for URL-based tenant selection on the login page.
 */

/** Hostnames that keep manual school selection (no host-based auto-resolve). */
const DEFAULT_LOGIN_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function parseDefaultHosts(): Set<string> {
  const raw = import.meta.env.VITE_LOGIN_DEFAULT_HOSTS as string | undefined;
  if (!raw?.trim()) {
    return DEFAULT_LOGIN_HOSTS;
  }
  return new Set(
    raw
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getLoginHostFromBrowser(): string {
  return window.location.hostname.trim().toLowerCase();
}

export function shouldAttemptHostTenantResolve(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return !parseDefaultHosts().has(normalized);
}
