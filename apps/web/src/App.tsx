import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import AppRoutes from "./routes/AppRoutes";
import theme from "./theme/theme";
import { AuthProvider, RBACProvider } from "./context";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <ErrorBoundary>
            <RBACProvider>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </RBACProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}