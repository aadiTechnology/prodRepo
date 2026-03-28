import { type FeeDiscount } from "../../types/feeDiscount";
import { type ListConfig } from "../../components/reusable/listFramework.types";
import StatusChip from "../../components/roles/StatusChip";
import { TableRowActions } from "../../components/reusable";

export type FeeDiscountListConfigArgs = {
  navigate: (path: string) => void;
  onDeleteClick?: (discount: FeeDiscount) => void;
  canEdit: boolean;
  canDelete: boolean;
};

export const createFeeDiscountListConfig = ({
  navigate,
  onDeleteClick,
  canEdit,
  canDelete,
}: FeeDiscountListConfigArgs): ListConfig<FeeDiscount> => ({
  columns: [
    {
      id: "discount_name",
      label: "Discount Name",
      field: "discount_name",
    },
    {
      id: "discount_type",
      label: "Type",
      field: "discount_type",
      render: (r: FeeDiscount) => r.discount_type === "PERCENTAGE" ? "Percentage" : "Fixed",
    },
    {
      id: "discount_value",
      label: "Value",
      field: "discount_value",
      render: (r: FeeDiscount) => r.discount_type === "PERCENTAGE" ? `${r.discount_value}%` : `₹${r.discount_value}`,
    },
    {
      id: "status",
      label: "Status",
      render: (r: FeeDiscount) => <StatusChip status={r.status ? "ACTIVE" : "INACTIVE"} />,
    },
   
  ],
  sortOptions: [
    { id: "name-asc", label: "Name (A-Z)", sortBy: "discount_name", sortOrder: "asc" },
    { id: "name-desc", label: "Name (Z-A)", sortBy: "discount_name", sortOrder: "desc" },
    { id: "created-desc", label: "Date (newest)", sortBy: "created_at", sortOrder: "desc" },
    { id: "created-asc", label: "Date (oldest)", sortBy: "created_at", sortOrder: "asc" },
  ],
  uiPolicy: {
    emptyMessage: "No fee discounts available.",
    errorFallbackMessage: "Failed to load fee discounts.",
    retryLabel: "Retry",
  },
  actions: {
    rowActions: (discount: FeeDiscount) => ({
      onEdit: canEdit ? () => navigate(`/fees/discounts/${discount.id}/edit`) : undefined,
      onDelete: canDelete && onDeleteClick ? () => onDeleteClick(discount) : undefined,
    }),
  },
});
