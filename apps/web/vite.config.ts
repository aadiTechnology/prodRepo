import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base path required for Capacitor WebView asset loading
  base: "./",
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8022',
      '/attendance': 'http://localhost:8022',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@mui")) return "mui";
            if (id.includes("react-router")) return "router";
            return "vendor";
          }
        },
      },
    },
  },
});