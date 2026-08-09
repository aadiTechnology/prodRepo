/**
 * Capacitor Push Notifications (FCM) bootstrap service.
 *
 * Registers the device for remote notifications, attaches lifecycle listeners,
 * and posts the FCM token to the backend when an authenticated session is present.
 * Safe to call multiple times — only the first call performs native registration.
 *
 * Supported only on native Capacitor shells (Android / iOS). On web this is a no-op.
 * The Capacitor plugin is loaded via dynamic import so missing/web installs cannot
 * crash the whole SPA at module-eval time (blank page / ErrorBoundary reload).
 *
 * Android notification tap navigation uses the same module→route map as the web
 * Notification List (`NOTIFICATION_MODULE_PATHS`). Navigation is delivered through
 * a React Router client registered by `PushNotificationNavigationBridge`; if the
 * Router/auth shell is not ready yet, the target path is retained until it is.
 *
 * @see https://capacitorjs.com/docs/apis/push-notifications
 */
import { isNativePlatform, getCapacitorPlatform } from "../utils/capacitor";
import type { NotificationModule } from "../pages/notifications/notification.types";
import { NOTIFICATION_MODULE_PATHS } from "../pages/notifications/notifications.mock";

/** Time to wait for FCM/APNs registration before giving up. */
const REGISTRATION_TIMEOUT_MS = 30_000;

/** Module-level guard so concurrent / repeated calls share one result. */
let initializationPromise: Promise<string | null> | null = null;

/** Ensures plugin event listeners are registered only once. */
let listenersAttached = false;

/** Last FCM token obtained from the native shell. */
let cachedFcmToken: string | null = null;

/** Last token successfully stored on the backend (avoid duplicate POSTs). */
let lastSyncedToken: string | null = null;

/** In-flight backend sync so concurrent auth + registration share one request. */
let backendSyncPromise: Promise<void> | null = null;

/**
 * Pending deep-link path from a notification tap that occurred before Router/auth
 * readiness (typical cold start). Latest tap wins.
 * Mirrored to sessionStorage on native so a soft WebView remount does not lose it.
 *
 * Path stays until an *authenticated* navigate succeeds so unauthenticated cold
 * starts can still resume the module after login (even if Login `location.state`
 * was lost).
 */
const PENDING_NAV_STORAGE_KEY = "aadi.push.pendingNavPath";
let pendingNavigationPath: string | null = null;

/**
 * Last module path staged while logged out (drives ProtectedRoute → login `from`).
 * Prevents resume/retry loops from re-navigating every appStateChange.
 */
let lastStagedUnauthenticatedPath: string | null = null;

/** React Router navigation client (registered by PushNotificationNavigationBridge). */
let navigationClient: PushNavigationClient | null = null;

/**
 * Optional inbox refresh callback (NotificationProvider). When a tap happens before
 * the provider mounts, `refreshOnNextHandler` defers one refresh.
 */
let notificationRefreshHandler: (() => void) | null = null;
let refreshOnNextHandler = false;

/** Handles for deferred flush retries (cold start / resume; cleared after delivery). */
let pendingFlushTimers: number[] = [];
let appStateListenerAttached = false;

function clearPendingFlushTimers(): void {
  for (const id of pendingFlushTimers) {
    window.clearTimeout(id);
  }
  pendingFlushTimers = [];
}

function readPersistedPendingPath(): string | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const value = sessionStorage.getItem(PENDING_NAV_STORAGE_KEY);
    if (typeof value === "string" && value.startsWith("/")) return value;
  } catch {
    // Ignore storage failures (private mode / quota).
  }
  return null;
}

function writePersistedPendingPath(path: string | null): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (path) {
      sessionStorage.setItem(PENDING_NAV_STORAGE_KEY, path);
    } else {
      sessionStorage.removeItem(PENDING_NAV_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
}

function setPendingNavigationPath(path: string | null): void {
  if (path !== pendingNavigationPath) {
    // New target (or clear) — allow one unauthenticated stage for the new path.
    lastStagedUnauthenticatedPath = null;
  }
  pendingNavigationPath = path;
  // Persist only on native; never affect web SPA behaviour.
  if (isNativePlatform()) {
    writePersistedPendingPath(path);
  }
}

function getPendingNavigationPath(): string | null {
  if (pendingNavigationPath) return pendingNavigationPath;
  if (!isNativePlatform()) return null;
  const restored = readPersistedPendingPath();
  if (restored) {
    pendingNavigationPath = restored;
  }
  return pendingNavigationPath;
}

type PushNotificationsPlugin = typeof import("@capacitor/push-notifications").PushNotifications;
type Token = import("@capacitor/push-notifications").Token;
type PermissionStatus = import("@capacitor/push-notifications").PermissionStatus;
type RegistrationError = import("@capacitor/push-notifications").RegistrationError;
type PushNotificationSchema = import("@capacitor/push-notifications").PushNotificationSchema;
type ActionPerformed = import("@capacitor/push-notifications").ActionPerformed;

/** Client that delivers notification-tap routes through the existing React Router. */
export type PushNavigationClient = {
  /** True once auth bootstrap finished (`!isLoading`) so ProtectedRoute can resolve. */
  isReady: boolean;
  /**
   * When false, navigate still stages the route for ProtectedRoute → login `from`,
   * but the pending path is retained until an authenticated delivery succeeds.
   */
  isAuthenticated: boolean;
  navigate: (path: string) => void;
};

/**
 * Map FCM `data.module` to an in-app route using existing NOTIFICATION_MODULE_PATHS.
 * Unknown / missing module → `/notifications` (general).
 */
export function resolveNotificationModulePath(module: unknown): string {
  const raw =
    typeof module === "string"
      ? module.trim().toLowerCase()
      : module != null
        ? String(module).trim().toLowerCase()
        : "";
  if (raw && Object.prototype.hasOwnProperty.call(NOTIFICATION_MODULE_PATHS, raw)) {
    return NOTIFICATION_MODULE_PATHS[raw as NotificationModule];
  }
  return NOTIFICATION_MODULE_PATHS.general;
}

/**
 * Normalize Capacitor/FCM notification data into a plain object.
 * Android may deliver a JSON string or nested `data` maps depending on payload shape.
 */
export function normalizeNotificationData(
  raw: unknown,
): Record<string, unknown> {
  if (raw == null) return {};

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      return normalizeNotificationData(JSON.parse(trimmed));
    } catch {
      return {};
    }
  }

  if (typeof raw !== "object" || Array.isArray(raw)) return {};

  const record = raw as Record<string, unknown>;
  // Some payload shapes nest custom keys under `data` again.
  if (record.data != null && typeof record.data === "object" && !Array.isArray(record.data)) {
    return {
      ...record,
      ...(record.data as Record<string, unknown>),
    };
  }
  if (typeof record.data === "string") {
    const nested = normalizeNotificationData(record.data);
    if (Object.keys(nested).length > 0) {
      return { ...record, ...nested };
    }
  }
  return record;
}

function extractModuleFromNotificationData(
  data: Record<string, unknown> | undefined | null,
): unknown {
  if (!data || typeof data !== "object") return undefined;
  // FCM data keys are strings; tolerate common casing variants.
  return data.module ?? data.Module ?? data.MODULE;
}

/**
 * Register (or clear) the React Router navigation client used for notification taps.
 * When `isReady` becomes true, any retained cold-start path is flushed once.
 */
export function setPushNavigationClient(client: PushNavigationClient | null): void {
  navigationClient = client;
  flushPendingNavigation();
  if (client?.isReady) {
    schedulePendingNavigationRetries();
  }
}

/**
 * Register a callback to refresh in-app notification state after a notification tap.
 * Does not mark notifications read (FCM payload has master notification_id only).
 */
export function setPushNotificationRefreshHandler(handler: (() => void) | null): void {
  notificationRefreshHandler = handler;
  if (handler && refreshOnNextHandler) {
    refreshOnNextHandler = false;
    try {
      handler();
    } catch (error) {
      console.error("[PushNotifications] Deferred notification refresh failed:", error);
    }
  }
}

function requestNotificationRefresh(): void {
  if (notificationRefreshHandler) {
    try {
      notificationRefreshHandler();
    } catch (error) {
      console.error("[PushNotifications] Notification refresh failed:", error);
    }
    return;
  }
  refreshOnNextHandler = true;
}

/**
 * Deliver a retained path once Router/auth client is ready.
 *
 * - Authenticated: navigate and clear (delivery complete).
 * - Unauthenticated: navigate once so ProtectedRoute can capture `from` for login;
 *   keep pending until login so resume still works if `location.state` is lost.
 */
function flushPendingNavigation(): void {
  const path = getPendingNavigationPath();
  if (!path || !navigationClient?.isReady) {
    return;
  }
  try {
    if (!navigationClient.isAuthenticated) {
      if (lastStagedUnauthenticatedPath === path) {
        return;
      }
      navigationClient.navigate(path);
      lastStagedUnauthenticatedPath = path;
      return;
    }

    navigationClient.navigate(path);
    setPendingNavigationPath(null);
    lastStagedUnauthenticatedPath = null;
    clearPendingFlushTimers();
  } catch (error) {
    // Keep pending so a later ready client / retry can still deliver the path.
    console.error("[PushNotifications] Navigation failed:", error);
  }
}

/**
 * Retry delivery shortly after ready — covers first paint / ProtectedRoute settle
 * on cold start and short post-login shell settle without a second user tap.
 */
function schedulePendingNavigationRetries(): void {
  if (!getPendingNavigationPath() || !navigationClient?.isReady) {
    return;
  }
  clearPendingFlushTimers();
  // Immediate + delayed passes; later retries no-op once path is fully delivered.
  for (const delayMs of [0, 50, 200, 500, 1000, 2000]) {
    const id = window.setTimeout(() => {
      flushPendingNavigation();
    }, delayMs);
    pendingFlushTimers.push(id);
  }
}

/**
 * Queue or immediately navigate to the module route for a notification tap.
 * Safe before Router/auth ready — path is retained until the client reports ready.
 */
export function requestNotificationNavigation(path: string): void {
  const target =
    typeof path === "string" && path.startsWith("/") ? path : NOTIFICATION_MODULE_PATHS.general;
  setPendingNavigationPath(target);
  flushPendingNavigation();
  schedulePendingNavigationRetries();
}

function handleNotificationActionPerformed(action: ActionPerformed): void {
  const data = normalizeNotificationData(action.notification?.data);
  const module = extractModuleFromNotificationData(data);
  const path = resolveNotificationModulePath(module);

  console.log("[PushNotifications] Notification action performed:", {
    actionId: action.actionId,
    inputValue: action.inputValue,
    module,
    path,
    notification: {
      id: action.notification.id,
      title: action.notification.title,
      body: action.notification.body,
      data: action.notification.data,
    },
  });

  // Refresh list/unread badge when NotificationProvider is available (or on next mount).
  requestNotificationRefresh();
  requestNotificationNavigation(path);
}

/**
 * Dynamically import the native Push Notifications plugin.
 *
 * Important: Capacitor plugins are Proxies that intercept *any* property access,
 * including `then`. Returning the plugin object from an `async` function (or
 * otherwise as a Promise resolution value) makes the JS Promise engine treat it
 * as a thenable and call `PushNotifications.then()`, which fails with:
 *   "PushNotifications.then() is not implemented on android"
 *
 * Always return a plain non-thenable container and unwrap the plugin only after
 * `await` has completed.
 */
async function loadPushPlugin(): Promise<{
  PushNotifications: PushNotificationsPlugin;
} | null> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return { PushNotifications };
  } catch (error) {
    console.error("[PushNotifications] Plugin unavailable:", error);
    return null;
  }
}

function mapPlatform(): "android" | "ios" | "web" {
  const p = getCapacitorPlatform().toLowerCase();
  if (p === "android" || p === "ios") return p;
  return "web";
}

function hasAuthSession(): boolean {
  try {
    return Boolean(localStorage.getItem("auth_token"));
  } catch {
    return false;
  }
}

/**
 * POST the cached FCM token to the backend if the user is authenticated.
 * No-ops when: not native, no token, no auth, or token already synced (unless force).
 * Safe to call after login / session restore.
 */
export async function syncDeviceTokenWithBackend(options?: {
  force?: boolean;
}): Promise<void> {
  if (!isNativePlatform()) return;
  if (!cachedFcmToken) return;
  if (!hasAuthSession()) return;
  if (!options?.force && cachedFcmToken === lastSyncedToken) return;

  if (backendSyncPromise) {
    return backendSyncPromise;
  }

  const tokenToSync = cachedFcmToken;
  backendSyncPromise = (async () => {
    try {
      const { default: notificationService } = await import(
        "../api/services/notificationService"
      );
      await notificationService.registerDevice({
        fcm_token: tokenToSync,
        platform: mapPlatform(),
      });
      lastSyncedToken = tokenToSync;
      console.log("[PushNotifications] FCM token registered with backend.");
    } catch (error) {
      console.error("[PushNotifications] Backend device registration failed:", error);
      // Allow retry on next login / token event.
      lastSyncedToken = null;
    } finally {
      backendSyncPromise = null;
    }
  })();

  return backendSyncPromise;
}

/**
 * Request notification permission, register with FCM/APNs, and attach event listeners.
 *
 * @returns The FCM (Android) / APNs (iOS) device token, or `null` if:
 * - running on web,
 * - permission was denied,
 * - registration failed / timed out,
 * - any unexpected error occurred.
 */
export async function initializePushNotifications(): Promise<string | null> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = runInitialization();
  return initializationPromise;
}

async function runInitialization(): Promise<string | null> {
  try {
    if (!isNativePlatform()) {
      console.log(
        "[PushNotifications] Skipping registration — not a native Capacitor platform.",
      );
      return null;
    }

    const loaded = await loadPushPlugin();
    if (!loaded) {
      return null;
    }
    const { PushNotifications } = loaded;

    // Attach listeners before register() so no events are missed (Capacitor best practice).
    await attachPushListeners(PushNotifications);

    const permission: PermissionStatus = await PushNotifications.requestPermissions();

    if (permission.receive !== "granted") {
      console.log(
        "[PushNotifications] Permission not granted:",
        permission.receive,
      );
      return null;
    }

    console.log("[PushNotifications] Permission granted — registering with FCM/APNs…");

    const token = await registerAndWaitForToken(PushNotifications);
    cachedFcmToken = token;
    console.log("[PushNotifications] Device registered. FCM token:", token);

    // If session already exists (cold start while logged in), store token now.
    await syncDeviceTokenWithBackend();

    return token;
  } catch (error) {
    console.error("[PushNotifications] Initialization failed:", error);
    // Reset so a later retry can attempt registration again if desired.
    initializationPromise = null;
    return null;
  }
}

/**
 * Subscribe to plugin events. Listeners stay active for the app lifetime.
 */
async function attachPushListeners(PushNotifications: PushNotificationsPlugin): Promise<void> {
  if (listenersAttached) {
    return;
  }

  await PushNotifications.addListener("registration", (token: Token) => {
    console.log("[PushNotifications] registration event — token received:", token.value);
    cachedFcmToken = token.value;
    // Token rotation: re-sync only when value changed or not yet stored.
    if (token.value !== lastSyncedToken) {
      void syncDeviceTokenWithBackend();
    }
  });

  await PushNotifications.addListener(
    "registrationError",
    (error: RegistrationError) => {
      console.error("[PushNotifications] registrationError:", error.error);
    },
  );

  await PushNotifications.addListener(
    "pushNotificationReceived",
    (notification: PushNotificationSchema) => {
      console.log(
        "[PushNotifications] Notification received (foreground):",
        {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
      );
    },
  );

  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action: ActionPerformed) => {
      handleNotificationActionPerformed(action);
    },
  );

  // Resume may complete after JS was paused; re-attempt any retained cold-start path.
  if (!appStateListenerAttached) {
    appStateListenerAttached = true;
    try {
      const { App } = await import("@capacitor/app");
      await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          flushPendingNavigation();
          schedulePendingNavigationRetries();
        }
      });
    } catch (error) {
      // App plugin optional for navigation; push action listener remains primary path.
      console.warn("[PushNotifications] App resume listener unavailable:", error);
      appStateListenerAttached = false;
    }
  }

  listenersAttached = true;
  console.log("[PushNotifications] Event listeners attached.");
}

/**
 * Call plugin register() and resolve when the `registration` event delivers a token.
 */
async function registerAndWaitForToken(
  PushNotifications: PushNotificationsPlugin,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      void cleanup();
      reject(
        new Error(
          `Push registration timed out after ${REGISTRATION_TIMEOUT_MS}ms`,
        ),
      );
    }, REGISTRATION_TIMEOUT_MS);

    let registrationHandle: { remove: () => Promise<void> } | null = null;
    let errorHandle: { remove: () => Promise<void> } | null = null;

    const cleanup = async (): Promise<void> => {
      window.clearTimeout(timeoutId);
      try {
        await registrationHandle?.remove();
        await errorHandle?.remove();
      } catch {
        // Ignore cleanup failures; permanent listeners remain from attachPushListeners.
      }
    };

    // Temporary listeners dedicated to completing this registration handshake.
    void (async () => {
      try {
        registrationHandle = await PushNotifications.addListener(
          "registration",
          async (token: Token) => {
            if (settled) return;
            settled = true;
            await cleanup();
            resolve(token.value);
          },
        );

        errorHandle = await PushNotifications.addListener(
          "registrationError",
          async (error: RegistrationError) => {
            if (settled) return;
            settled = true;
            await cleanup();
            reject(new Error(error.error || "Push registration failed"));
          },
        );

        await PushNotifications.register();
      } catch (error) {
        if (settled) return;
        settled = true;
        await cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    })();
  });
}
