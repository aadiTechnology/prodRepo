import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider, RBACProvider } from "./context";
import ThemeFromTenantProvider from "./theme/ThemeFromTenantProvider";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
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