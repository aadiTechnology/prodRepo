import { useMemo } from "react";
import { Alert, Box, Snackbar, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { SearchableSelect } from "../../components/semantic";
import { useSprintListController } from "../../hooks/useSprintListController";

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
    closeSnackbar,
    confirmDialogOpen,
    sprintToDelete,
    deleteLoading,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    onAdd,
  } = useSprintListController({ navigate });

  const columns = useMemo(
    () => [
      { key: "sprint_id", label: "ID", minWidth: 60, render: (r: any) => r.sprint_id },
      { key: "sprint_name", label: "Name", minWidth: 220, render: (r: any) => r.sprint_name || "—" },
      { key: "start_date", label: "Start", minWidth: 120, render: (r: any) => r.start_date || "—" },
      { key: "end_date", label: "End", minWidth: 120, render: (r: any) => r.end_date || "—" },
      {
        key: "is_active",
        label: "Active",
        minWidth: 90,
        render: (r: any) => (r.is_active == null ? "—" : r.is_active ? "Yes" : "No"),
      },
    ],
    []
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
                  <Box sx={{ minWidth: 0, width: "100%", maxWidth: "100%" }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Project
                    </Typography>
                    <SearchableSelect
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
            <Box sx={{ m: 2 }}>
              <Alert severity="error">{error}</Alert>
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
        columns={columns as any}
        data={sprints as any}
        loading={loading}
        emptyMessage={projectId == null ? "Select a project to view sprints." : "No sprints found."}
        renderRowActions={(row: any) => (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => navigate(`/sprints/${row.sprint_id}/edit`)}
            >
              Edit
            </Typography>
            <Typography
              variant="body2"
              color="error"
              sx={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => openDeleteConfirm(row)}
            >
              Delete
            </Typography>
          </Box>
        )}
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

