import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aaditech.preschool",
  appName: "Preschool",
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
      // Keep native splash until React SmartKidz splash paints, then AppSplashGate hides it.
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#FFF8F0",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#FFF8F0",
    },
  },
};

export default config;
