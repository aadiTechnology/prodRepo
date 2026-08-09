import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider, RBACProvider } from "./context";
import ThemeFromTenantProvider from "./theme/ThemeFromTenantProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import { isNativePlatform } from "./utils/capacitor";
import PushNotificationNavigationBridge from "./services/PushNotificationNavigationBridge";

/**
 * Start FCM bootstrap as soon as this module evaluates on native shells.
 * useEffect alone attaches listeners after first paint — too late for some cold
 * starts. initializePushNotifications is idempotent (shared promise + listener guard).
 */
function bootstrapPushNotifications(): void {
  if (!isNativePlatform()) return;
  void import("./services/pushNotificationService")
    .then(({ initializePushNotifications }) => initializePushNotifications())
    .then((token) => {
      if (token) {
        console.log("[App] Push notifications ready. Token:", token);
      }
    })
    .catch((error) => {
      console.error("[App] Push notification bootstrap failed:", error);
    });
}

// Immediate attempt on native (cold start from tray tap).
bootstrapPushNotifications();

export default function App() {
  // Fallback if the module-level call was skipped (e.g. first eval was on web HMR).
  // Listeners (including pushNotificationActionPerformed) must be attached early so
  // background/terminated taps are retained until PushNotificationNavigationBridge
  // reports auth ready.
  useEffect(() => {
    bootstrapPushNotifications();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RBACProvider>
          <AuthProvider>
            <PushNotificationNavigationBridge />
            <ThemeFromTenantProvider>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </ThemeFromTenantProvider>
          </AuthProvider>
        </RBACProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
