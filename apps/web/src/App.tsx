import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider, RBACProvider } from "./context";
import ThemeFromTenantProvider from "./theme/ThemeFromTenantProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import { isNativePlatform } from "./utils/capacitor";

export default function App() {
  // Register for FCM/APNs once at app startup (native only; dynamic import avoids web crash).
  useEffect(() => {
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
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RBACProvider>
          <AuthProvider>
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
