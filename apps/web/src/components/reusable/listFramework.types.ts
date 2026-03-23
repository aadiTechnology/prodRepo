import type { ReactNode } from "react";
import type { DataTableColumn } from "./DataTable";
import type { TableRowActionsProps } from "./TableRowActions";

export type ListSortOrder = "asc" | "desc";

export type ListSortOption<TSortBy extends string> = {
  id: string;
  label: string;
  sortBy: TSortBy;
  sortOrder: ListSortOrder;
};

export type ListUiPolicy = {
  emptyMessage: ReactNode;
  errorFallbackMessage: string;
  retryLabel: string;
};

export interface ListConfig<T extends object, TSortBy extends string = string> {
  columns: DataTableColumn<T>[];
  sortOptions: ListSortOption<TSortBy>[];
  uiPolicy: ListUiPolicy;
  actions: {
    rowActions: (row: T) => TableRowActionsProps | undefined;
  };
}
