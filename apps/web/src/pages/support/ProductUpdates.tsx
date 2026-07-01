import { Box, Typography } from "@mui/material";

export default function ProductUpdates() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Product Updates
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Product updates list is not yet configured.
      </Typography>
    </Box>
  );
}
