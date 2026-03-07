import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import AppThemeProvider from "./theme/AppThemeProvider";
import { AuthProvider, RBACProvider } from "./context";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <RBACProvider>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </RBACProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}