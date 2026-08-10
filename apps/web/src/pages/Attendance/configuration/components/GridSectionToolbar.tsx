import { Box } from "@mui/material";

import { ListPageToolbar } from "../../../../components/reusable";

export interface GridSectionToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchTestId?: string;
  searchPlaceholder?: string;
  onAdd: () => void;
  addLabel: string;
  addTestId?: string;
}

export default function GridSectionToolbar({
  searchValue,
  onSearchChange,
  searchTestId,
  searchPlaceholder,
  onAdd,
  addLabel,
  addTestId,
}: GridSectionToolbarProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <ListPageToolbar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        searchTestId={searchTestId}
        onAddClick={onAdd}
        addLabel={addLabel}
        addButtonTestId={addTestId}
      />
    </Box>
  );
}
