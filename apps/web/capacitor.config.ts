import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aaditech.preschoolerp",
  appName: "Preschool ERP",
  webDir: "dist",
  server: {
    // Allow live reload during development (optional — set CAPACITOR_DEV_SERVER_URL)
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1976d2",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#1976d2",
    },
  },
};

export default config;
