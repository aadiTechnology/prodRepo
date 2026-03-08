/**
 * TableRowActions — Reusable (Phase 7)
 * Edit / Delete / View icon buttons for table rows. Theme-driven.
 */

import { IconButton, Tooltip } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from "@mui/icons-material";

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
          <IconButton size={size} aria-label="View" onClick={onView} disabled={disabled}>
            <ViewIcon fontSize={size} />
          </IconButton>
        </Tooltip>
      )}
      {onEdit != null && (
        <Tooltip title="Edit">
          <IconButton size={size} aria-label="Edit" onClick={onEdit} disabled={disabled}>
            <EditIcon fontSize={size} />
          </IconButton>
        </Tooltip>
      )}
      {onDelete != null && (
        <Tooltip title="Delete">
          <IconButton size={size} aria-label="Delete" onClick={onDelete} disabled={disabled}>
            <DeleteIcon fontSize={size} />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
