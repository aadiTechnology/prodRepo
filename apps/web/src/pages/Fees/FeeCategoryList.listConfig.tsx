import React from "react";
import StatusChip from "../../components/roles/StatusChip";
import type { FeeCategoryResponse } from "../../types/fee";
import type { NavigateFunction } from "react-router-dom";

export type FeeCategoryListConfigOptions = {
  navigate: NavigateFunction;
  onDeleteClick: (category: FeeCategoryResponse) => void;
};

export function createFeeCategoryListConfig({
  navigate,
  onDeleteClick,
}: FeeCategoryListConfigOptions) {
  return {
    columns: [
      {
        id: "class",
        label: "Class",
        render: (cat: FeeCategoryResponse) => cat.class_name ?? "—",
        align: "left" as const,
      },
      {
        id: "name",
        label: "Category Name",
        field: "name",
        align: "left" as const,
      },
      {
        id: "amount",
        label: "Amount (₹)",
        render: (cat: FeeCategoryResponse) =>
          cat.amount != null ? `₹${Number(cat.amount).toLocaleString()}` : "—",
        align: "right" as const,
      },
      {
        id: "status",
        label: "Status",
        render: (cat: FeeCategoryResponse) => (
          <StatusChip status={cat.status ? "ACTIVE" : "INACTIVE"} />
        ),
        align: "center" as const,
      },
    ],
    rowActions: {
      onEdit: (cat: FeeCategoryResponse) => navigate(`/fees/categories/edit/${cat.id}`),
      onDelete: (cat: FeeCategoryResponse) => onDeleteClick(cat),
    },
    uiPolicy: {
      emptyMessage: "No fee categories available.",
      title: "Fee Category Directory",
    },
  };
}
