import React from "react";
import StatusChip from "../../components/roles/StatusChip";
import type { FeeStructure } from "../../types/fee";
import type { NavigateFunction } from "react-router-dom";

export type FeeStructureListConfigOptions = {
  navigate: NavigateFunction;
  onDeleteClick: (id: number) => void;
};

export function createFeeStructureListConfig({
  navigate,
  onDeleteClick,
}: FeeStructureListConfigOptions) {
  return {
    columns: [
      {
        id: "name",
        label: "Structure Name",
        render: (s: FeeStructure) => s.name || "N/A",
      },
      {
        id: "class",
        label: "Class / Division",
        render: (s: FeeStructure) => s.class_division_name ? `${s.class_name || "N/A"} - ${s.class_division_name}` : (s.class_name || "N/A"),
      },
      {
        id: "category",
        label: "Category",
        render: (s: FeeStructure) => s.fee_category_name || "N/A",
      },
      {
        id: "ay",
        label: "Academic Year",
        render: (s: FeeStructure) => s.academic_year_name || "N/A",
      },
      {
        id: "amount",
        label: "Total Amount",
        render: (s: FeeStructure) => `₹${Number(s.total_amount).toLocaleString()}`,
      },
      {
        id: "type",
        label: "Installment Type",
        render: (s: FeeStructure) => s.installment_type,
      },
      {
        id: "status",
        label: "Status",
        render: (s: FeeStructure) => (
          <StatusChip status={s.is_active ? "ACTIVE" : "INACTIVE"} />
        ),
        align: "center" as const,
      },
    ],
    rowActions: {
      onEdit: (s: FeeStructure) => navigate(`/fees/setup/${s.id}/edit`),
      onDelete: (s: FeeStructure) => onDeleteClick(s.id),
    },
    uiPolicy: {
      emptyMessage: "No fee structures found. Click 'Setup Fee' to begin.",
      title: "Fee Structure Directory",
    },
  };
}
