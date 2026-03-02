import { Card, CardContent, Typography, Box, Skeleton, Grid, Button } from "@mui/material";
import { Group as GroupIcon, Business as BusinessIcon, AccountTree as AccountTreeIcon } from "@mui/icons-material";
import { RoleSummary } from "../../types/role.types";

interface RoleSummaryCardsProps {
  summary?: RoleSummary;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

const cards = [
  {
    label: "Total Roles",
    icon: <GroupIcon fontSize="large" color="primary" />,
    key: "totalRoles",
    color: "primary.main",
  },
  {
    label: "Platform Roles",
    icon: <BusinessIcon fontSize="large" color="info" />,
    key: "platformRoles",
    color: "info.main",
  },
  {
    label: "Tenant Roles",
    icon: <AccountTreeIcon fontSize="large" color="secondary" />,
    key: "tenantRoles",
    color: "secondary.main",
  },
];

export default function RoleSummaryCards({ summary, loading, error, onRetry }: RoleSummaryCardsProps) {
  if (error) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
        <Typography color="error" variant="h6" gutterBottom>
          Failed to load role summary.
        </Typography>
        <Button variant="outlined" color="primary" onClick={onRetry}>
          Retry
        </Button>
      </Box>
    );
  }
  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid item xs={12} sm={4} key={card.key}>
          <Card
            elevation={2}
            sx={{
              display: "flex",
              alignItems: "center",
              px: 2,
              py: 2,
              borderRadius: 2,
              transition: "box-shadow 0.2s",
              "&:hover": { boxShadow: 6 },
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ mr: 2 }}>{card.icon}</Box>
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {card.label}
              </Typography>
              {loading ? (
                <Skeleton variant="text" width={60} height={32} />
              ) : (
                <Typography variant="h4" fontWeight={800} color={card.color}>
                  {summary ? summary[card.key as keyof RoleSummary] : "-"}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}