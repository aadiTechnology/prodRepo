import { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { colorTokens } from "../../../../tokens/colors";

export interface ConfigSectionCardProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  "data-testid"?: string;
}

export default function ConfigSectionCard({
  id,
  title,
  description,
  children,
  "data-testid": dataTestId,
}: ConfigSectionCardProps) {
  return (
    <Paper
      id={id}
      elevation={0}
      data-testid={dataTestId}
      sx={{
        borderRadius: 3,
        border: `1px solid ${colorTokens.border.default}`,
        overflow: "hidden",
      }}
    >
      <Box
        sx={(theme) => ({
          px: { xs: 2, sm: 3 },
          py: 1.5,
          bgcolor: theme.palette.grey[50],
          borderBottom: `1px solid ${colorTokens.border.subtle}`,
        })}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
    </Paper>
  );
}
