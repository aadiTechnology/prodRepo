import { Box, Typography } from "@mui/material";

export default function AddFaq() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Add FAQ
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        FAQ form is not yet configured.
      </Typography>
    </Box>
  );
}
