import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider, RBACProvider } from "./context";
import ThemeFromTenantProvider from "./theme/ThemeFromTenantProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import { initializePushNotifications } from "./services/pushNotificationService";

export default function App() {
  // Register for FCM/APNs once at app startup (no-op on web).
  useEffect(() => {
    void initializePushNotifications().then((token) => {
      if (token) {
        console.log("[App] Push notifications ready. Token:", token);
      }
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