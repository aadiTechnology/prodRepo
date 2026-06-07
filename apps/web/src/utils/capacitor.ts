import { Capacitor } from "@capacitor/core";

/** True when running inside a native Capacitor shell (Android/iOS). */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** Current Capacitor platform: `web`, `android`, or `ios`. */
export function getCapacitorPlatform(): string {
  return Capacitor.getPlatform();
}

/** Hostname used by the Capacitor WebView (always treat as a dev/default login host). */
export function isCapacitorWebViewHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1";
}
