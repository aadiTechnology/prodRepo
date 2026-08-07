/**
 * Capacitor Push Notifications (FCM) bootstrap service.
 *
 * Registers the device for remote notifications and attaches lifecycle listeners.
 * Safe to call multiple times — only the first call performs registration.
 *
 * Supported only on native Capacitor shells (Android / iOS). On web this is a no-op.
 * The Capacitor plugin is loaded via dynamic import so missing/web installs cannot
 * crash the whole SPA at module-eval time (blank page / ErrorBoundary reload).
 *
 * @see https://capacitorjs.com/docs/apis/push-notifications
 */
import { isNativePlatform } from "../utils/capacitor";

/** Time to wait for FCM/APNs registration before giving up. */
const REGISTRATION_TIMEOUT_MS = 30_000;

/** Module-level guard so concurrent / repeated calls share one result. */
let initializationPromise: Promise<string | null> | null = null;

/** Ensures plugin event listeners are registered only once. */
let listenersAttached = false;

type PushNotificationsPlugin = typeof import("@capacitor/push-notifications").PushNotifications;
type Token = import("@capacitor/push-notifications").Token;
type PermissionStatus = import("@capacitor/push-notifications").PermissionStatus;
type RegistrationError = import("@capacitor/push-notifications").RegistrationError;
type PushNotificationSchema = import("@capacitor/push-notifications").PushNotificationSchema;
type ActionPerformed = import("@capacitor/push-notifications").ActionPerformed;

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
    console.log("[PushNotifications] Device registered. FCM token:", token);
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
    // Token is primarily resolved via registerAndWaitForToken(); keep a log for visibility.
    console.log("[PushNotifications] registration event — token received:", token.value);
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
      console.log("[PushNotifications] Notification action performed:", {
        actionId: action.actionId,
        inputValue: action.inputValue,
        notification: {
          id: action.notification.id,
          title: action.notification.title,
          body: action.notification.body,
          data: action.notification.data,
        },
      });
    },
  );

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
