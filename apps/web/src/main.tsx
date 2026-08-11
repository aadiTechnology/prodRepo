import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SnackbarProvider } from "notistack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isNativePlatform } from "./utils/capacitor";

const queryClient = new QueryClient();

async function bootstrap() {
  if (isNativePlatform()) {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      // Keep app content below the system status bar (prevents header collapse on Android).
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: "#FFF8F0" });
    } catch {
      // Status bar plugin is unavailable on some WebView versions
    }
    // Native splash stays visible until AppSplashGate paints the React splash and calls hide().
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