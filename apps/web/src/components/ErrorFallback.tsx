/**
 * Error Fallback Component
 * Simple fallback UI for error boundaries
 */

import { Box, Typography, Button } from "@mui/material";
import { ErrorOutline } from "@mui/icons-material";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        p: 3,
        textAlign: "center",
      }}
    >
      <ErrorOutline sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Oops! Something went wrong
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {error.message || "An unexpected error occurred"}
      </Typography>
      <Button variant="contained" onClick={resetError}>
        Try Again
      </Button>
    </Box>
  );
}
