import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SnackbarProvider } from "notistack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // <-- Add this

const queryClient = new QueryClient(); // <-- Add this

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
      <QueryClientProvider client={queryClient}> {/* <-- Add this */}
        <App />
      </QueryClientProvider> {/* <-- Add this */}
    </SnackbarProvider>
  </React.StrictMode>
);