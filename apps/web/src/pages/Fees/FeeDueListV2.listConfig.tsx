import { Avatar, Link, Skeleton, Stack, Typography } from "@mui/material";
import type { NavigateFunction } from "react-router-dom";

import type { DataTableColumn } from "../../components/reusable";
import StatusChip from "../../components/roles/StatusChip";
import { colorTokens } from "../../tokens/colors";
import type { FeeDueStatusFilter } from "../../api/services/feesApi";
import type { FeeDueTableRow } from "../../hooks/useFeeDueListController";

export const FEE_DUE_STATUS_OPTIONS: { label: string; value: FeeDueStatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Due", value: "DUE" },
  { label: "Overdue", value: "OVERDUE" },
];

export function formatCurrency(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type FeeDueListConfigArgs = {
  navigate: NavigateFunction;
};

export function createFeeDueListV2Columns({
  navigate,
}: FeeDueListConfigArgs): DataTableColumn<FeeDueTableRow>[] {
  return [
    {
      id: "student_name",
      label: "Student Name",
      render: (row: FeeDueTableRow) =>
        row.__skeleton ? (
          <Skeleton width={180} />
        ) : (
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Avatar sx={{ width: 32, height: 32, bgcolor: colorTokens.primary.main, fontSize: "0.75rem" }}>
              {getInitials(row.student_name)}
            </Avatar>
            <Typography sx={{ fontWeight: 700 }}>{row.student_name}</Typography>
          </Stack>
        ),
    },
    {
      id: "class_name",
      label: "Class",
      render: (row: FeeDueTableRow) => (row.__skeleton ? <Skeleton width={80} /> : row.class_name || "-"),
    },
    {
      id: "installment",
      label: "Installment",
      render: (row: FeeDueTableRow) => (row.__skeleton ? <Skeleton width={90} /> : row.installment || "-"),
    },
    {
      id: "invoice_id",
      label: "Invoice ID",
      render: (row: FeeDueTableRow) =>
        row.__skeleton ? (
          <Skeleton width={90} />
        ) : row.invoice_id ? (
          <Link
            component="button"
            underline="hover"
            onClick={() => navigate(`/fees/invoices?search=${encodeURIComponent(row.invoice_id || "")}`)}
            sx={{ fontWeight: 700 }}
          >
            {row.invoice_id}
          </Link>
        ) : (
          "-"
        ),
    },
    {
      id: "due_amount",
      label: "Due Amount (₹)",
      align: "right" as const,
      render: (row: FeeDueTableRow) =>
        row.__skeleton ? <Skeleton width={90} sx={{ ml: "auto" }} /> : formatCurrency(row.due_amount),
    },
    {
      id: "due_date",
      label: "Due Date",
      render: (row: FeeDueTableRow) => (row.__skeleton ? <Skeleton width={90} /> : formatDate(row.due_date)),
    },
    {
      id: "status",
      label: "Status",
      render: (row: FeeDueTableRow) =>
        row.__skeleton ? (
          <Skeleton width={120} />
        ) : (
          <StatusChip
            status={row.status}
            label={row.status === "OVERDUE" ? `${row.days_overdue} days overdue` : "Due"}
          />
        ),
    },
  ];
}
