import { IconButton, Tooltip, alpha } from "@mui/material";
import { Box } from "../primitives";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { colorTokens } from "../../tokens/colors";

export interface TableRowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  /** Use external-link icon + visit tooltip instead of the default eye icon. */
  viewAsRedirect?: boolean;
  disabled?: boolean;
  size?: "small" | "medium";
  viewTestId?: string;
  editTestId?: string;
  deleteTestId?: string;
}

export default function TableRowActions({
  onEdit,
  onDelete,
  onView,
  viewAsRedirect = false,
  disabled = false,
  size = "small",
  viewTestId = "btn-view-row",
  editTestId = "btn-edit-row",
  deleteTestId = "btn-delete-row",
}: TableRowActionsProps) {
  const viewColor = viewAsRedirect
    ? colorTokens.primary.main
    : colorTokens.preschool.lavender.main;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      {onView != null && (
        <Tooltip title={viewAsRedirect ? "Visit link" : "View"}>
          <IconButton 
            size={size} 
            onClick={onView} 
            disabled={disabled}
            data-testid={viewTestId}
            sx={{ 
              color: viewColor,
              "&:hover": { 
                bgcolor: alpha(viewColor, 0.1),
                transform: "scale(1.15) rotate(5deg)"
              },
              transition: "all 0.2s"
            }}
          >
            {viewAsRedirect ? (
              <OpenInNewIcon fontSize={size} />
            ) : (
              <ViewIcon fontSize={size} />
            )}
          </IconButton>
        </Tooltip>
      )}
      {onEdit != null && (
        <Tooltip title="Edit">
          <IconButton 
            size={size} 
            onClick={onEdit} 
            disabled={disabled}
            data-testid={editTestId}
            sx={{ 
              color: colorTokens.preschool.turquoise.main,
              "&:hover": { 
                bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.1),
                transform: "scale(1.15) rotate(-5deg)"
              },
              transition: "all 0.2s"
            }}
          >
            <EditIcon fontSize={size} />
          </IconButton>
        </Tooltip>
      )}
      {onDelete != null && (
        <Tooltip title="Delete">
          <IconButton 
            size={size} 
            onClick={onDelete} 
            disabled={disabled}
            data-testid={deleteTestId}
            sx={{ 
              color: colorTokens.preschool.coral.main,
              "&:hover": { 
                bgcolor: alpha(colorTokens.preschool.coral.main, 0.1),
                transform: "scale(1.15) rotate(5deg)"
              },
              transition: "all 0.2s"
            }}
          >
            <DeleteIcon fontSize={size} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
