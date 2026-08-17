import { useMemo, useState, useEffect } from "react";
import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import {
  EntityTableSection,
  ListPageLayout,
  ListPageToolbar,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import TableRowActions from "../../components/reusable/TableRowActions";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import type { DataTableColumn } from "../../components/reusable/DataTable";
import { useFaqListController } from "../../hooks/useFaqListController";
import { useFaqData } from "./context/FaqDataContext";
import {
  isSupportQueryOwner,
  SUPPORT_UNREAD_CHANGED_EVENT,
  type SupportQueryItem,
  type SupportQueryStatus,
} from "./support.types";

function statusChipColor(
  status: SupportQueryStatus
): "default" | "success" | "error" | "warning" | "info" {
  switch (status) {
    case "Open":
      return "info";
    case "In Progress":
      return "warning";
    case "Resolved":
      return "success";
    case "Closed":
      return "default";
    default:
      return "default";
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ContactSupport() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const c = useFaqListController();
  const { deleteQuery, refreshQueries } = useFaqData();
  const [deleteTarget, setDeleteTarget] = useState<SupportQueryItem | null>(null);

  useEffect(() => {
    const onUnreadChanged = () => {
      void refreshQueries();
    };
    window.addEventListener(SUPPORT_UNREAD_CHANGED_EVENT, onUnreadChanged);
    return () => window.removeEventListener(SUPPORT_UNREAD_CHANGED_EVENT, onUnreadChanged);
  }, [refreshQueries]);

  const columns = useMemo<DataTableColumn<SupportQueryItem>[]>(() => {
    const cols: DataTableColumn<SupportQueryItem>[] = [
      {
        id: "id",
        label: "Query ID",
        render: (row) => row.id,
      },
      {
        id: "category",
        label: "Category",
        render: (row) => row.category,
      },
      {
        id: "subject",
        label: "Subject",
        render: (row) => (
          <Box
            sx={{
              maxWidth: 240,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={row.subject}
          >
            {row.subject}
          </Box>
        ),
      },
      {
        id: "createdAt",
        label: "Created Date & Time",
        render: (row) => formatDateTime(row.createdAt),
      },
    ];

    if (c.perms.isSuperAdmin || c.perms.isSchoolAdmin) {
      cols.push({
        id: "createdBy",
        label: "Created By",
        render: (row) => (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="body2">{row.createdBy}</Typography>
            {row.forwardedToSuperAdmin ? (
              <Chip size="small" label="Forwarded" color="warning" variant="outlined" />
            ) : null}
          </Stack>
        ),
      });
    }

    cols.push(
      {
        id: "status",
        label: "Status",
        align: "center",
        headerAlign: "center",
        render: (row) => (
          <Chip
            size="small"
            label={row.status}
            color={statusChipColor(row.status)}
            data-testid={`chip-query-status-${row.id}`}
          />
        ),
      },
      {
        id: "actions",
        label: "Action",
        align: "center",
        headerAlign: "center",
        render: (row) => {
          const isOwner = isSupportQueryOwner(row, c.perms.actorRole);
          return (
            <TableRowActions
              onView={() => navigate(`/support/contact/${row.id}`)}
              onEdit={
                isOwner ? () => navigate(`/support/contact/${row.id}/edit`) : undefined
              }
              onDelete={isOwner ? () => setDeleteTarget(row) : undefined}
              viewTestId={`btn-view-query-${row.id}`}
              editTestId={`btn-edit-query-${row.id}`}
              deleteTestId={`btn-delete-query-${row.id}`}
            />
          );
        },
      }
    );

    return cols;
  }, [c.perms.actorRole, c.perms.isSchoolAdmin, c.perms.isSuperAdmin, navigate]);

  const toolbarFilters = useMemo(
    () => [
      {
        label: "Category",
        value: c.categoryFilter,
        onChange: c.setCategoryFilter,
        options: c.categoryOptions,
      },
      {
        label: "Status",
        value: c.statusFilter,
        onChange: c.setStatusFilter,
        options: c.statusOptions,
      },
    ],
    [
      c.categoryFilter,
      c.categoryOptions,
      c.setCategoryFilter,
      c.setStatusFilter,
      c.statusFilter,
      c.statusOptions,
    ]
  );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteQuery(deleteTarget.id);
      enqueueSnackbar(`Query ${deleteTarget.id} deleted.`, { variant: "success" });
      setDeleteTarget(null);
    } catch {
      enqueueSnackbar("Failed to delete query.", { variant: "error" });
    }
  };

  if (!c.perms.canAccessSupport || !c.perms.canViewMyQueries) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-support-queries-denied">
        <Alert severity="warning">Access Denied</Alert>
      </Box>
    );
  }

  const emptyMessage = (
    <Box sx={{ py: 2, textAlign: "center" }} data-testid="empty-support-queries">
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        No queries found
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        You haven&apos;t raised any support queries yet.
      </Typography>
      {c.perms.canCreateQuery && !c.perms.isSuperAdmin ? (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/support/contact/add")}
          data-testid="btn-empty-create-query"
        >
          Create Query
        </Button>
      ) : null}
    </Box>
  );

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[{ title: "My Queries", path: "/support/contact" }]}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={c.search}
              onSearchChange={c.setSearch}
              searchPlaceholder="Search by ID, subject, category…"
              searchTestId="input-query-search"
              addButtonTestId={
                c.perms.isSuperAdmin ? "support-category-add" : "btn-create-query"
              }
              onAddClick={
                c.perms.isSuperAdmin
                  ? () => navigate("/support/contact/categories")
                  : c.perms.canCreateQuery
                    ? () => navigate("/support/contact/add")
                    : undefined
              }
              addLabel={c.perms.isSuperAdmin ? "Add" : "Create Query"}
              addIcon={<AddIcon sx={{ fontSize: 24 }} />}
              filters={toolbarFilters.map((filter) =>
                filter.label === "Category"
                  ? { ...filter, testId: "support-query-category-filter" }
                  : filter
              )}
            />
          }
        />
      }
    >
      <Box data-testid="support-my-queries">
        <EntityTableSection<SupportQueryItem>
          label=""
          showInfoBar={false}
          totalRows={c.totalRows}
          page={c.page}
          rowsPerPage={c.rowsPerPage}
          onPageChange={c.setPage}
          onRowsPerPageChange={(value) => {
            c.setRowsPerPage(value);
            c.setPage(0);
          }}
          columns={columns}
          data={c.paginatedQueries}
          loading={false}
          emptyMessage={emptyMessage}
          emptyTestId="empty-support-queries-table"
          getRowKey={(row) => row.id}
          getRowSx={(row) =>
            !row.isViewed
              ? { fontWeight: 700, color: "text.primary" }
              : { fontWeight: 500 }
          }
          stickyHeader
          size="small"
          showPagination={c.totalRows > 0}
          data-testid="table-support-queries"
        />
      </Box>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Query"
        message={`Permanently delete ${deleteTarget?.id ?? ""}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
        data-testid="dialog-delete-query"
      />
    </ListPageLayout>
  );
}
