import React, { useMemo } from "react";
import {
  Download as DownloadIcon,
  RestartAlt as ResetIcon,
  TrendingDown,
  TrendingUp,
  AccountBalance,
  PieChart,
} from "@mui/icons-material";
import { alpha, Stack, Box, Alert, Tooltip, IconButton } from "@mui/material";

import { useFeeReportController } from "../../hooks/useFeeReportController";
import { PageHeader, PageLayout } from "../../components/layout";
import { EntityTableSection } from "../../components/reusable";
import { AppCard, TextField } from "../../components/primitives";
import { colorTokens } from "../../tokens/colors";
import type { FeeReportRow } from "../../types/feeReport";
import { feeReportListConfig, money } from "./FeeReportPage.listConfig";

// Components
import { SummaryAnalytics } from "./components/SummaryAnalytics";
import { FeeReportFilters } from "./components/FeeReportFilters";

// ── Shared local gradient icon button (matches MarkAttendance pattern) ──────
const HeaderGradientIconButton = ({
  onClick,
  icon,
  label,
  disabled = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) => (
  <Tooltip title={label}>
    <span style={{ display: "inline-flex" }}>
      <IconButton
        onClick={onClick}
        aria-label={label}
        disabled={disabled}
        sx={{
          background: disabled
            ? alpha(colorTokens.text.secondary, 0.12)
            : `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
          color: disabled ? colorTokens.text.secondary : colorTokens.primary.contrast,
          borderRadius: "15px",
          width: { xs: 40, sm: 44 },
          height: { xs: 40, sm: 44 },
          boxShadow: disabled
            ? "none"
            : `0 8px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.25)}`,
          transition: "all 0.3s ease",
          "&:hover": {
            transform: disabled ? "none" : "scale(1.08)",
            boxShadow: disabled
              ? "none"
              : `0 12px 20px ${alpha(colorTokens.preschool.turquoise.main, 0.35)}`,
          },
        }}
      >
        {icon}
      </IconButton>
    </span>
  </Tooltip>
);

// ── Export to CSV helper ────────────────────────────────────────────────────
function exportToCsv(rows: FeeReportRow[]) {
  const headers = [
    "Student Name",
    "Admission No",
    "Class",
    "Division",
    "Invoice No",
    "Installment",
    "Invoiced (₹)",
    "Paid (₹)",
    "Due (₹)",
    "Status",
    "Due Date",
  ];
  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      [
        `"${r.student_name}"`,
        r.admission_no ?? "",
        `"${r.class_name ?? ""}"`,
        r.division_name ?? "",
        r.invoice_no,
        r.installment_label ?? "",
        r.invoiced_amount,
        r.paid_amount,
        r.due_amount,
        r.invoice_status,
        r.due_date ? new Date(r.due_date).toLocaleDateString("en-IN") : "",
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fee_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function FeeReportPage() {
  const c = useFeeReportController();

  const hasFilters =
    !!c.academicYearId || !!c.classId || !!c.installment || !!c.startDate || !!c.endDate || !!c.search;

  // ── Transform options for FeeReportFilters component ──
  const transformedOptions = useMemo(() => ({
    academicYears: c.filterOptions.academic_years.map(y => ({ label: y.name, value: String(y.id) })),
    classes: c.filterOptions.classes.map(cl => ({ label: cl.name, value: String(cl.id) })),
    installments: c.filterOptions.installments.map(inst => ({ label: inst, value: inst })),
  }), [c.filterOptions]);

  // ── Header Actions (Row 1) ──
  const headerActions = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      gap={1}
      sx={{
        width: { xs: "100%", sm: "auto" },
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: "100%", sm: "auto" } }}>
        <TextField
          label="From"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={c.startDate}
          onChange={(e) => { c.setStartDate(e.target.value); c.setPage(0); }}
          sx={{
            flex: 1,
            minWidth: 0,
            "& .MuiOutlinedInput-root": {
              borderRadius: "15px",
              fontSize: "0.85rem",
              fontWeight: 600,
              bgcolor: "#ffffff",
              "& fieldset": { borderColor: colorTokens.border.subtle },
            },
          }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={c.endDate}
          onChange={(e) => { c.setEndDate(e.target.value); c.setPage(0); }}
          sx={{
            flex: 1,
            minWidth: 0,
            "& .MuiOutlinedInput-root": {
              borderRadius: "15px",
              fontSize: "0.85rem",
              fontWeight: 600,
              bgcolor: "#ffffff",
              "& fieldset": { borderColor: colorTokens.border.subtle },
            },
          }}
        />
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent={{ xs: "flex-start", sm: "flex-end" }}
      >
        <HeaderGradientIconButton
          onClick={c.handleReset}
          icon={<ResetIcon sx={{ fontSize: 22 }} />}
          label="Reset Filters"
          disabled={!hasFilters || c.loading}
        />

        <HeaderGradientIconButton
          onClick={() => exportToCsv(c.rows)}
          icon={<DownloadIcon sx={{ fontSize: 22 }} />}
          label="Export CSV"
          disabled={c.rows.length === 0 || c.loading}
        />
      </Stack>
    </Stack>
  );

  return (
    <PageLayout
      pageBackground
      header={
        <PageHeader
          links={[
            { title: "Fees", path: "/fees" },
            { title: "Fee Report", path: "/fees/reports" }
          ]}
          homePath="/"
          actions={headerActions}
        />
      }
    >
      <Box sx={{ px: { xs: 1.5, sm: 3 }, py: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* ── Filters (Row 2) ── */}
        <FeeReportFilters
          search={c.search}
          setSearch={c.setSearch}
          academicYearId={c.academicYearId ? String(c.academicYearId) : ""}
          setAcademicYearId={(id) => { c.setAcademicYearId(id ? Number(id) : null); c.setPage(0); }}
          classId={c.classId ? String(c.classId) : ""}
          setClassId={(id) => { c.setClassId(id ? Number(id) : null); c.setPage(0); }}
          installment={c.installment}
          setInstallment={(inst) => { c.setInstallment(inst); c.setPage(0); }}
          options={transformedOptions}
        />

        {c.error && (
          <Alert severity="error" sx={{ borderRadius: '12px' }} onClose={() => c.setError(null)}>
            {c.error}
          </Alert>
        )}

        {/* ── Summary Analytics (Row 3) ── */}
        <SummaryAnalytics
          totalInvoiced={money(c.summary.total_invoiced)}
          totalCollected={money(c.summary.total_collected)}
          totalPending={money(c.summary.total_pending)}
          collectionPercentage={c.summary.collection_percentage}
          totalStudents={c.summary.total_students}
          loading={c.loading && c.rows.length === 0}
          colors={{
            primary: colorTokens.primary.main,
            success: colorTokens.success.main,
            error: colorTokens.error.main,
            warning: colorTokens.warning.main,
          }}
          icons={{
            invoiced: <AccountBalance sx={{ fontSize: 26 }} />,
            collected: <TrendingUp sx={{ fontSize: 26 }} />,
            pending: <TrendingDown sx={{ fontSize: 26 }} />,
            efficiency: <PieChart sx={{ fontSize: 26 }} />,
          }}
        />

        {/* ── Table Ledger (Row 4) ── */}
        <AppCard
          paddingSize="none"
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: "14px",
            border: `1px solid ${colorTokens.border.default}`,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
          }}
        >
          <EntityTableSection<FeeReportRow>
            label="Institutional Fee Ledger"
            totalRows={c.totalRows}
            page={c.page}
            rowsPerPage={c.rowsPerPage}
            onPageChange={c.setPage}
            onRowsPerPageChange={c.setRowsPerPage}
            columns={feeReportListConfig.columns}
            data={c.rows}
            loading={c.loading}
            emptyMessage={
              hasFilters
                ? "No records matched your current filter criteria."
                : feeReportListConfig.uiPolicy.emptyMessage
            }
            stickyHeader
          />
        </AppCard>
      </Box>
    </PageLayout>
  );
}
