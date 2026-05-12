import { useMemo } from "react";
import { Alert, Box, Button, Snackbar, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { EntityTableSection, ListPageLayout, ListPageToolbar } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { useNoticeListController } from "../../hooks/useNoticeListController";
import { createNoticeListConfig, renderNoticeRowActions } from "./NoticeList.listConfig";
import type { Notice } from "../../types/notice";

export default function NoticeList() {
  const navigate = useNavigate();
  const c = useNoticeListController();

  const listConfig = useMemo(
    () =>
      createNoticeListConfig({
        navigate,
        onDeleteClick: c.openDeleteConfirm,
      }),
    [c.openDeleteConfirm, navigate]
  );

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[{ title: "Notice Board", path: "/communication/notices" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={c.search}
                onSearchChange={c.setSearch}
                searchPlaceholder="Search by title or keyword…"
                onAddClick={() => navigate("/communication/notices/new")}
                addLabel="Create Notice"
                addIcon={<AddIcon sx={{ fontSize: 24 }} />}
                filters={[
                  {
                    label: "Status",
                    value: c.status,
                    onChange: c.setStatus,
                    options: c.statusFilterOptions,
                  },
                  {
                    label: "Type",
                    value: c.noticeType,
                    onChange: c.setNoticeType,
                    options: c.noticeTypeFilterOptions,
                  },
                  {
                    label: "Audience",
                    value: c.audienceType,
                    onChange: c.setAudienceType,
                    options: c.audienceFilterOptions,
                  },
                ]}
              />
            }
          />
          {c.error ? (
            <Box sx={{ m: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
              <Typography variant="body2" color="error">
                {c.error}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => void c.fetchNotices()}
                disabled={c.loading}
              >
                {listConfig.uiPolicy.retryLabel}
              </Button>
            </Box>
          ) : null}
        </>
      }
    >
      <EntityTableSection<Notice>
        label="Notices"
        totalRows={c.totalRows}
        page={c.page}
        rowsPerPage={c.rowsPerPage}
        onPageChange={c.setPage}
        onRowsPerPageChange={c.setRowsPerPage}
        columns={listConfig.columns}
        data={c.items}
        loading={c.loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        getRowKey={(row) => row.id}
        renderRowActions={(row) => {
          const actions = listConfig.actions.rowActions(row);
          return renderNoticeRowActions({
            row,
            onView: actions?.onView ?? (() => undefined),
            onEdit: actions?.onEdit,
            onDelete: actions?.onDelete,
          });
        }}
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={c.confirmDialogOpen}
        title="Please Confirm"
        message="Are you sure you want to delete this notice?"
        confirmLabel={c.deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={() => void c.confirmDelete()}
        onClose={c.closeDeleteConfirm}
        loading={c.deleteLoading}
      />

      <Snackbar
        open={!!c.snackbar}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => c.setSnackbar(null)}
      >
        <Alert onClose={() => c.setSnackbar(null)} severity="success" sx={{ width: "100%" }}>
          {c.snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
}
