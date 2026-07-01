import { Box, Typography } from "@mui/material";

export default function FaqList() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        FAQ List
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        FAQ module is not yet configured.
      </Typography>
    </Box>
  );
}
