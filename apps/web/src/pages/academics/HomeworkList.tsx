import { useNavigate } from "react-router-dom";
import { Alert, Snackbar } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { PageHeader } from "../../components/layout";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
} from "../../components/reusable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useHomeworkListController } from "../../hooks/useHomeworkListController";
import { useRBAC } from "../../context/RBACContext";
import {
  createHomeworkListConfig,
  type HomeworkRow,
} from "./HomeworkList.listConfig";

export default function HomeworkList() {
  const navigate = useNavigate();
  const controller = useHomeworkListController();
  const { hasPermission } = useRBAC();
  const canView = hasPermission("HOMEWORK_MGMT:view");

  const listConfig = createHomeworkListConfig({
    navigate,
    onDeleteClick: controller.handleDeleteClick,
    canEdit: hasPermission("HOMEWORK_MGMT:edit"),
    canDelete: hasPermission("HOMEWORK_MGMT:delete"),
    emptyMessage: controller.readOnlyAudience
      ? "No homework assigned for your class yet."
      : "No homework found. Click 'Assign Homework' to create one.",
  });

  if (!canView) {
    return (
      <ListPageLayout
        header={
          <PageHeader
            links={[{ title: "Homework", path: "#" }]}
            homePath="/"
          />
        }
      >
        <Alert severity="error" sx={{ m: 2 }}>
          Access Denied: You do not have permission to view this page.
        </Alert>
      </ListPageLayout>
    );
  }

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      header={
        <PageHeader
          links={[{ title: "Homework", path: "#" }]}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={controller.search}
              onSearchChange={controller.setSearch}
              searchPlaceholder="Search homework by title..."
              filters={
                controller.readOnlyAudience
                  ? []
                  : [
                      {
                        label: "Academic Year",
                        value: controller.academicYearFilter,
                        onChange: controller.setAcademicYearFilter,
                        options: controller.academicYearOptions,
                      },
                      {
                        label: "Class",
                        value: controller.classFilter,
                        onChange: controller.setClassFilter,
                        options: controller.classOptions,
                      },
                      {
                        label: "Status",
                        value: controller.statusFilter,
                        onChange: controller.setStatusFilter,
                        options: controller.statusOptions,
                      },
                    ]
              }
              {...(hasPermission("HOMEWORK_MGMT:create")
                ? {
                    onAddClick: () => navigate("/homework/new"),
                    addLabel: "Assign Homework",
                    addIcon: <AddIcon sx={{ fontSize: 24 }} />,
                  }
                : {})}
            />
          }
        />
      }
    >
      {controller.error && (
        <Alert
          severity="error"
          sx={{ m: 2 }}
          onClose={() => controller.setError(null)}
        >
          {controller.error}
        </Alert>
      )}

      <EntityTableSection<HomeworkRow>
        label="Homework"
        totalRows={controller.total}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.setPage}
        onRowsPerPageChange={controller.setRowsPerPage}
        columns={listConfig.columns}
        data={controller.homework}
        loading={controller.loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        rowActions={listConfig.actions.rowActions}
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={controller.deleteDialogOpen}
        title="Delete Homework?"
        message={`Are you sure you want to delete "${controller.selectedRow?.title}"? This action cannot be undone.`}
        confirmText={controller.deleteLoading ? "Deleting..." : "Delete"}
        onConfirm={controller.handleConfirmDelete}
        onCancel={() => controller.setDeleteDialogOpen(false)}
        loading={controller.deleteLoading}
      />

      <Snackbar
        open={!!controller.success}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => controller.setSuccess(null)}
      >
        <Alert
          onClose={() => controller.setSuccess(null)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {controller.success}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
}
