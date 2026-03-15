import { IconButton, Tooltip, alpha } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from "@mui/icons-material";
import { colorTokens } from "../../tokens/colors";

export interface TableRowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  disabled?: boolean;
  size?: "small" | "medium";
}

export default function TableRowActions({
  onEdit,
  onDelete,
  onView,
  disabled = false,
  size = "small",
}: TableRowActionsProps) {
  return (
    <>
      {onView != null && (
        <Tooltip title="View">
          <IconButton 
            size={size} 
            onClick={onView} 
            disabled={disabled}
            sx={{ 
              color: colorTokens.preschool.lavender.main,
              "&:hover": { 
                bgcolor: alpha(colorTokens.preschool.lavender.main, 0.1),
                transform: "scale(1.15) rotate(5deg)"
              },
              transition: "all 0.2s"
            }}
          >
            <ViewIcon fontSize={size} />
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
