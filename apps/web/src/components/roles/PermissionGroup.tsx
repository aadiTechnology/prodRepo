import { Card, CardContent, Typography, Checkbox, Grid, Box } from "@mui/material";
import { Permission } from "../../types/role.types";

interface PermissionGroupProps {
  module: string;
  permissions: Permission[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onSelectAll: () => void;
  allSelected: boolean;
  accentColor: string;
}

export default function PermissionGroup({
  module,
  permissions,
  selected,
  onChange,
  onSelectAll,
  allSelected,
  accentColor,
}: PermissionGroupProps) {
  const handleToggle = (id: string) => {
    const selectedIds = Array.isArray(selected) ? selected : [];
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(pid => pid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: accentColor,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            flex: 1,
            fontSize: 13,
          }}
        >
          {module}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: accentColor,
            fontWeight: 700,
            cursor: "pointer",
            textTransform: "uppercase",
            fontSize: 12,
            ml: 2,
            letterSpacing: 1,
          }}
          onClick={onSelectAll}
        >
          {allSelected ? "Deselect All" : "Select All"}
        </Typography>
      </Box>
      <Grid container spacing={3}>
        {permissions.map((perm) => {
          const selectedIds = Array.isArray(selected) ? selected : [];
          const checked = selectedIds.includes(perm.id);
          return (
            <Grid item xs={12} sm={6} md={4} key={perm.id}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  borderColor: checked ? accentColor : "grey.800",
                  bgcolor: "background.default",
                  transition: "border-color 0.2s",
                  "&:hover": { borderColor: accentColor },
                }}
                onClick={() => handleToggle(perm.id)}
              >
                <Checkbox
                  checked={checked}
                  onChange={() => handleToggle(perm.id)}
                  sx={{
                    color: accentColor,
                    "&.Mui-checked": { color: accentColor },
                  }}
                  tabIndex={-1}
                  disableRipple
                />
                <Typography sx={{ fontWeight: 600, color: "text.primary" }}>
                  {perm.name}
                </Typography>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}