import { IconButton, Tooltip, alpha } from "@mui/material";
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
}

export default function TableRowActions({
  onEdit,
  onDelete,
  onView,
  viewAsRedirect = false,
  disabled = false,
  size = "small",
}: TableRowActionsProps) {
  const viewColor = viewAsRedirect
    ? colorTokens.primary.main
    : colorTokens.preschool.lavender.main;

  return (
    <>
      {onView != null && (
        <Tooltip title={viewAsRedirect ? "Visit link" : "View"}>
          <IconButton 
            size={size} 
            onClick={onView} 
            disabled={disabled}
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
    </>
  );
}
