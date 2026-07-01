import { Box, Typography } from "@mui/material";

export default function FaqDetail() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        FAQ Detail
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        FAQ details are not yet configured.
      </Typography>
    </Box>
  );
}
