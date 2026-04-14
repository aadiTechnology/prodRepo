/**
 * Lead Management Page - Capture and track admission leads
 * Displays lead list with search, status/source filters, and CRUD operations
 */

import { useMemo } from "react";
import { Box, Alert, Snackbar, Chip, IconButton, Tooltip } from "@mui/material";
import { Autorenew as ConvertIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  ListPageLayout,
  ListPageToolbar,
  DirectoryInfoBar,
  DataTable,
  TableRowActions,
  TablePaginationBar,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useLeadListController } from "../../hooks/useLeadListController";
import type { Lead } from "../../types/lead";
import { formatShortDate } from "../../utils/formatters";

// ═══════════════════════════════════════════════════════════════════════════
// Lead Management Page Component
// ═══════════════════════════════════════════════════════════════════════════
const LeadManagementPage = () => {
  const navigate = useNavigate();

  const {
    leads,
    loading,
    error,
    totalLeads,
    page,
    rowsPerPage,
    search,
    setSearch,
    setPage,
    setRowsPerPage,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    statusFilterOptions,
    sourceFilterOptions,
    snackbar,
    setSnackbar,
    confirmDialogOpen,
    leadToDelete,
    deleteLoading,
    setConfirmDialogOpen,
    handleDeleteClick,
    handleConfirmDelete,
    fetchLeads,
  } = useLeadListController();

  const columns = useMemo(
    () => [
      {
        id: "lead_code",
        label: "Lead #",
        render: (row: Lead) => (
          <Box
            component="span"
            sx={{
              fontSize: "0.75rem",
              fontFamily: "monospace",
              color: "text.secondary",
            }}
          >
            {row.lead_code}
          </Box>
        ),
      },
      {
        id: "child_name",
        label: "Child Name",
        render: (row: Lead) => (
          <Box sx={{ fontWeight: 500 }}>{row.child_name}</Box>
        ),
      },
      {
        id: "parent",
        label: "Parent / Contact",
        render: (row: Lead) => (
          <Box>
            <Box sx={{ fontWeight: 500, fontSize: "0.85rem" }}>
              {row.parent_name || "—"}
            </Box>
            <Box sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {row.mobile_number || ""}
            </Box>
          </Box>
        ),
      },
      {
        id: "source_name",
        label: "Source",
        render: (row: Lead) => row.source_name || "—",
      },
      {
        id: "status_name",
        label: "Status",
        render: (row: Lead) =>
          row.status_name ? (
            <Chip
              label={row.status_name}
              size="small"
              sx={{
                backgroundColor: row.status_color || "#e0e0e0",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.72rem",
              }}
            />
          ) : (
            "—"
          ),
      },
      {
        id: "next_followup_date",
        label: "Next Follow-up",
        render: (row: Lead) =>
          row.next_followup_date ? (
            <Box
              component="span"
              sx={{
                color: isOverdue(row.next_followup_date)
                  ? "error.main"
                  : "text.primary",
                fontWeight: isOverdue(row.next_followup_date) ? 600 : 400,
                fontSize: "0.82rem",
              }}
            >
              {formatShortDate(row.next_followup_date)}
            </Box>
          ) : (
            <Box component="span" sx={{ color: "text.disabled", fontSize: "0.82rem" }}>
              Not scheduled
            </Box>
          ),
      },
    ],
    []
  );

  const rangeStart =
    totalLeads > 0 ? Math.min(page * rowsPerPage + 1, totalLeads) : 0;
  const rangeEnd = Math.min((page + 1) * rowsPerPage, totalLeads);

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[{ title: "Lead Management", path: "#" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search lead, parent, contact..."
                onAddClick={() => navigate("/admissions/leads/add")}
                addLabel="Add Lead"
                filters={[
                  {
                    label: "Status",
                    value: statusFilter,
                    onChange: setStatusFilter,
                    options: statusFilterOptions,
                  },
                  {
                    label: "Source",
                    value: sourceFilter,
                    onChange: setSourceFilter,
                    options: sourceFilterOptions,
                  },
                ]}
              />
            }
          />
          {error && (
            <Alert
              severity="error"
              sx={{ m: 2 }}
              onClose={() => fetchLeads()}
              action={
                <Box
                  component="span"
                  sx={{ cursor: "pointer", textDecoration: "underline", ml: 1 }}
                  onClick={fetchLeads}
                >
                  Retry
                </Box>
              }
            >
              {error}
            </Alert>
          )}
        </>
      }
    >
      {!loading && totalLeads > 0 && (
        <DirectoryInfoBar
          label="Leads"
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={totalLeads}
        />
      )}

      <DataTable<Lead & Record<string, unknown>>
        columns={columns}
        data={leads as (Lead & Record<string, unknown>)[]}
        loading={loading}
        emptyMessage="No leads found. Click '+ Add Lead' to capture your first inquiry."
        renderRowActions={(row) => (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <TableRowActions
              onView={() => navigate(`/admissions/leads/${row.id}`)}
              onEdit={() => navigate(`/admissions/leads/${row.id}/edit`)}
              onDelete={() => handleDeleteClick(row)}
            />
            {!row.converted && (
              <Tooltip title="Convert to Student">
                <IconButton
                  size="small"
                  onClick={() => {
                    if (!row.id) return;
                    navigate(`/admissions/enrollment/from-lead/${row.id}`);
                  }}
                  sx={{
                    color: "success.main",
                    ml: 0.5,
                    "&:hover": {
                      bgcolor: "success.light",
                      color: "success.contrastText",
                      transform: "scale(1.15) rotate(180deg)",
                    },
                    transition: "all 0.3s",
                  }}
                >
                  <ConvertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
        stickyHeader
        size="small"
      />

      {!loading && totalLeads > 0 && (
        <TablePaginationBar
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={totalLeads}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => {
            setRowsPerPage(v);
            setPage(0);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Delete Lead"
        message={`Are you sure you want to delete lead for ${leadToDelete?.child_name || "this child"}?`}
        confirmText={deleteLoading ? "Deleting..." : "Confirm"}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialogOpen(false)}
        loading={deleteLoading}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(null)}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
};

function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return d < today;
}

export default LeadManagementPage;
