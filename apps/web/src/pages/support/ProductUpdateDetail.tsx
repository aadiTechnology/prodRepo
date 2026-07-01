import { Box, Typography } from "@mui/material";

export default function ProductUpdateDetail() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Product Update Detail
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Product update details are not yet configured.
      </Typography>
    </Box>
  );
}
