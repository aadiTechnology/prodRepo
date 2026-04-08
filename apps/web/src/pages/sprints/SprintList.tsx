import { useMemo } from "react";
import { Alert, Box, Button, Snackbar, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { SearchableSelect } from "../../components/semantic";
import { useSprintListController } from "../../hooks/useSprintListController";
import { createSprintListConfig, renderSprintRowActions } from "./SprintList.listConfig";

export default function SprintList() {
  const navigate = useNavigate();
  const {
    projectId,
    setProjectId,
    projects,
    projectsLoading,
    listState: {
      search,
      onSearchChange,
      page,
      setPage,
      rowsPerPage,
      onRowsPerPageChange,
      sortBy,
      setSortBy,
      sortOrder,
      setSortOrder,
    },
    sprints,
    total,
    loading,
    error,
    snackbar,
    fetchSprints,
    closeSnackbar,
    confirmDialogOpen,
    sprintToDelete,
    deleteLoading,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    onAdd,
  } = useSprintListController({ navigate });

  const listConfig = useMemo(
    () =>
      createSprintListConfig({
        navigate,
        onDeleteClick: openDeleteConfirm,
      }),
    [navigate, openDeleteConfirm]
  );

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[{ title: "Sprints", path: "#" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={search}
                onSearchChange={onSearchChange}
                searchPlaceholder="Search sprints..."
                onAddClick={onAdd}
                addLabel="Add Sprint"
                filters={[
                  {
                    label: "Sort by ID",
                    value: sortBy === "sprint_id" ? sortOrder : "",
                    onChange: (val) => {
                      if (!val) return;
                      setSortBy("sprint_id");
                      setSortOrder(val as "asc" | "desc");
                    },
                    options: [
                      { label: "Ascending", value: "asc" },
                      { label: "Descending", value: "desc" },
                    ],
                  },
                  {
                    label: "Sort by Name",
                    value: sortBy === "sprint_name" ? sortOrder : "",
                    onChange: (val) => {
                      if (!val) return;
                      setSortBy("sprint_name");
                      setSortOrder(val as "asc" | "desc");
                    },
                    options: [
                      { label: "A-Z", value: "asc" },
                      { label: "Z-A", value: "desc" },
                    ],
                  },
                ]}
                renderActions={
                  <Box sx={{ minWidth: 0, width: "100%", maxWidth: "100%" }}><SearchableSelect
                      label=""
                      valueId={projectId}
                      options={projects}
                      onChangeId={(id) => setProjectId(id)}
                      placeholder={projectsLoading ? "Loading…" : "Select project"}
                      disabled={projectsLoading}
                    />
                  </Box>
                }
              />
            }
          />
          {error && (
            <Box sx={{ m: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={fetchSprints}
                disabled={loading}
              >
                {listConfig.uiPolicy.retryLabel}
              </Button>
            </Box>
          )}
        </>
      }
    >
      <EntityTableSection
        label="Sprint Directory"
        totalRows={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={onRowsPerPageChange}
        columns={listConfig.columns as any}
        data={sprints as any}
        loading={loading}
        emptyMessage={projectId == null ? "Select a project to view sprints." : listConfig.uiPolicy.emptyMessage}
        renderRowActions={(row: any) =>
          renderSprintRowActions({
            row,
            onEdit: () => navigate(`/sprints/${row.sprint_id}/edit`),
            onDelete: () => openDeleteConfirm(row),
          })
        }
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Please Confirm"
        message={`Are you sure you want to delete sprint ${sprintToDelete?.sprint_name || sprintToDelete?.sprint_id}?`}
        confirmLabel={deleteLoading ? "Deleting..." : "Confirm"}
        onConfirm={confirmDelete}
        onClose={closeDeleteConfirm}
        loading={deleteLoading}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={closeSnackbar}
      >
        <Alert onClose={closeSnackbar} severity="success" sx={{ width: "100%" }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
}

