import { alpha } from "@mui/material/styles";
import { Box, Chip, Stack, Typography } from "@mui/material";
import type { NavigateFunction } from "react-router-dom";
import type { ListConfig } from "../../components/reusable/listFramework.types";
import StatusChip from "../../components/roles/StatusChip";
import { MarketingHubConfig } from "../../api/services/marketingHubService";
import { colorTokens } from "../../tokens/colors";
import { getBrandColor, getPlatformIcon } from "./marketingHub.utils";

export type MarketingHubRow = MarketingHubConfig;

type ListConfigArgs = {
  navigate: NavigateFunction;
  onDeleteClick: (platform: MarketingHubConfig) => void;
  onVisit: (url: string, isActive: boolean) => void;
};

const LinkConfiguredChip = ({ configured }: { configured: boolean }) => (
  <Chip
    label={configured ? "Configured" : "Not Configured"}
    size="small"
    sx={{
      fontWeight: 700,
      fontSize: "0.72rem",
      bgcolor: alpha(configured ? colorTokens.success.main : colorTokens.error.main, 0.1),
      color: configured ? colorTokens.success.main : colorTokens.error.main,
      border: `1px solid ${alpha(configured ? colorTokens.success.main : colorTokens.error.main, 0.25)}`,
      borderRadius: "8px",
      height: 24,
    }}
  />
);

export const createMarketingHubListConfig = ({
  navigate,
  onDeleteClick,
  onVisit,
}: ListConfigArgs): ListConfig<MarketingHubRow> => ({
  columns: [
    {
      id: "platform",
      label: "Platform",
      render: (row) => {
        const brandColor = getBrandColor(row.code);
        return (
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(brandColor, 0.12),
                color: brandColor,
                flexShrink: 0,
                "& svg": { fontSize: 20 },
              }}
            >
              {getPlatformIcon(row.code)}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.code}
              </Typography>
            </Box>
          </Stack>
        );
      },
    },
    {
      id: "category",
      label: "Category",
      render: (row) => (
        <Chip
          label={row.category}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600, maxWidth: "100%" }}
        />
      ),
    },
    {
      id: "link_status",
      label: "Integration Link",
      render: (row) => <LinkConfiguredChip configured={Boolean(row.url?.trim())} />,
    },
    {
      id: "status",
      label: "Status",
      render: (row) => {
        const isActive = row.link_active ?? true;
        return <StatusChip status={isActive ? "ACTIVE" : "INACTIVE"} />;
      },
    },
  ],
  sortOptions: [
    { id: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" },
    { id: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" },
    { id: "category-asc", label: "Category (A-Z)", sortBy: "category", sortOrder: "asc" },
  ],
  uiPolicy: {
    emptyMessage: "No marketing platforms match your filters.",
    errorFallbackMessage: "Failed to load marketing platforms.",
    retryLabel: "Retry",
  },
  actions: {
    rowActions: (row) => {
      const isActive = row.link_active ?? true;
      const savedUrl = row.url || "";
      const canVisit = Boolean(savedUrl.trim()) && isActive;

      return {
        onEdit: () => navigate(`/marketing/hub/${row.platform_id}/edit`),
        onDelete: () => onDeleteClick(row),
        onView: canVisit ? () => onVisit(savedUrl, isActive) : undefined,
        viewAsRedirect: true,
      };
    },
  },
});
