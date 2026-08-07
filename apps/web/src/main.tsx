import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SnackbarProvider } from "notistack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isNativePlatform } from "./utils/capacitor";

const queryClient = new QueryClient();

async function bootstrap() {
  if (isNativePlatform()) {
    const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
    ]);

    try {
      // Keep app content below the system status bar (prevents header collapse on Android).
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
    } catch {
      // Status bar plugin is unavailable on some WebView versions
    }

    try {
      await SplashScreen.hide();
    } catch {
      // Splash screen may already be hidden
    }
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </SnackbarProvider>
    </React.StrictMode>,
  );
}

void bootstrap();