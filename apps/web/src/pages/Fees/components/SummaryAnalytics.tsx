import React from "react";
import { alpha, Stack, Box, Typography } from "@mui/material";
import { AppCard } from "../../../components/primitives";

interface SummaryCardProps {
  label: string;
  value: string;
  subtext?: string;
  color: string;
  icon: React.ReactNode;
  trend?: number;
}

/**
 * Premium SummaryCard with glassmorphism-inspired design and hover interactions.
 */
export function SummaryCard({ label, value, subtext, color, icon, trend }: SummaryCardProps) {
  return (
    <AppCard
      sx={{
        height: "100%",
        background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`,
        border: `1px solid ${alpha(color, 0.1)}`,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.25s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 8px 16px ${alpha(color, 0.1)}`,
          borderColor: alpha(color, 0.2),
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          right: 0,
          width: "80px",
          height: "80px",
          background: `radial-gradient(circle at top right, ${alpha(color, 0.1)}, transparent 70%)`,
          pointerEvents: "none",
        }
      }}
      paddingSize="dense"
    >
      <Stack direction="row" spacing={{ xs: 1.25, sm: 2 }} alignItems="center">
        <Box
          sx={{
            width: { xs: 42, sm: 52 },
            height: { xs: 42, sm: 52 },
            borderRadius: { xs: "14px", sm: "16px" },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(color, 0.15),
            color: color,
            flexShrink: 0,
            boxShadow: `inset 0 0 0 1px ${alpha(color, 0.2)}`,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={700}
            textTransform="uppercase"
            sx={{ letterSpacing: 1, display: "block", mb: 0.5, fontSize: { xs: "0.55rem", sm: "0.6rem" } }}
          >
            {label}
          </Typography>
          <Typography
            variant="h5"
            fontWeight={700}
            color="text.primary"
            sx={{
              lineHeight: 1.1,
              fontSize: { xs: "1.52rem", sm: "1.7rem" },
              opacity: 0.92,
              letterSpacing: "-0.01em",
            }}
          >
            {value}
          </Typography>
          {subtext && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: { xs: 0.45, sm: 0.75 }, display: "block", fontWeight: 500, fontSize: { xs: "0.62rem", sm: "0.72rem" } }}
            >
              {subtext}
            </Typography>
          )}
        </Box>
      </Stack>
      {trend !== undefined && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            bgcolor: alpha(color, 0.1)
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${Math.min(trend, 100)}%`,
              bgcolor: color,
              boxShadow: `0 0 8px ${color}`
            }}
          />
        </Box>
      )}
    </AppCard>
  );
}

interface SummaryAnalyticsProps {
  totalInvoiced: string;
  totalCollected: string;
  totalPending: string;
  collectionPercentage: number;
  totalStudents: number;
  loading: boolean;
  colors: {
    primary: string;
    success: string;
    error: string;
    warning: string;
  };
  icons: {
    invoiced: React.ReactNode;
    collected: React.ReactNode;
    pending: React.ReactNode;
    efficiency: React.ReactNode;
  };
}

export function SummaryAnalytics({
  totalInvoiced,
  totalCollected,
  totalPending,
  collectionPercentage,
  totalStudents,
  loading,
  colors,
  icons
}: SummaryAnalyticsProps) {
  if (loading) return null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(4, 1fr)",
        },
        gap: { xs: 1.5, sm: 2.25, lg: 3 },
        mb: { xs: 1.5, sm: 3, lg: 4 },
      }}
    >
      <SummaryCard
        label="Total Projected"
        value={totalInvoiced}
        subtext={`${totalStudents} Enrolled Students`}
        color={colors.primary}
        icon={icons.invoiced}
      />
      <SummaryCard
        label="Net Revenue"
        value={totalCollected}
        subtext="Realized Collections"
        color={colors.success}
        icon={icons.collected}
      />
      <SummaryCard
        label="Outstanding"
        value={totalPending}
        subtext="Pending Receivables"
        color={colors.error}
        icon={icons.pending}
      />
      <SummaryCard
        label="Efficiency"
        value={`${collectionPercentage.toFixed(1)}%`}
        subtext={
          collectionPercentage >= 90
            ? "Exceeding Targets"
            : collectionPercentage >= 60
              ? "Steady Progress"
              : "Requires Attention"
        }
        color={
          collectionPercentage >= 90
            ? colors.success
            : collectionPercentage >= 60
              ? colors.warning
              : colors.error
        }
        icon={icons.efficiency}
        trend={collectionPercentage}
      />
    </Box>
  );
}
