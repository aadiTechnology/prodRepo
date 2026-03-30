import { useState } from "react";
import Menu from "@mui/material/Menu";
import { Box, Button, Checkbox, MenuItem, Typography } from "../primitives";

export interface ColumnVisibilityOption {
  id: string;
  label: string;
}

export interface ColumnVisibilityMenuProps {
  options: ColumnVisibilityOption[];
  visibleIds: Set<string>;
  onChange: (visibleIds: Set<string>) => void;
}

export default function ColumnVisibilityMenu({ options, visibleIds, onChange }: ColumnVisibilityMenuProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const toggle = (id: string) => {
    const next = new Set(visibleIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size === 0) return;
    onChange(next);
  };

  return (
    <Box>
      <Button variant="outlined" size="small" onClick={(e) => setAnchor(e.currentTarget)}>
        Columns
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Visible columns
          </Typography>
        </MenuItem>
        {options.map((opt) => (
          <MenuItem key={opt.id} dense onClick={() => toggle(opt.id)}>
            <Checkbox checked={visibleIds.has(opt.id)} size="small" sx={{ p: 0, mr: 1 }} />
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
