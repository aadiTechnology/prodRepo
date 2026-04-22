import { useMemo } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Snackbar,
  Typography,
} from "@mui/material";
import {
  EntityTableSection,
  ListPageLayout,
  ListPageToolbar,
  TableRowActions,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import StatusChip from "../../components/roles/StatusChip";
import { colorTokens } from "../../tokens/colors";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import type { ListConfig } from "../../components/reusable";
import {
  type TeacherAssignmentRow,
  useTeacherAssignmentsController,
} from "./useTeacherAssignmentsController";

export default function TeacherAssignmentsPage() {
  const {
    navigate,
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    snackbar,
    snackbarSeverity,
    setSnackbar,
    setSnackbarSeverity,
    confirmDialogOpen,
    rowToDelete,
    deleteLoading,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    rows,
    totalRows,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
  } = useTeacherAssignmentsController();

  const listConfig = useMemo<ListConfig<TeacherAssignmentRow, "class">>(
    () => ({
      columns: [
        { id: "class", label: "Class", field: "class" },
        { id: "division", label: "Division", field: "division" },
        {
          id: "teacherName",
          label: "Teacher Name",
          render: (row: TeacherAssignmentRow) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Avatar
                sx={{
                  width: 30,
                  height: 30,
                  fontSize: "0.75rem",
                  bgcolor: colorTokens.preschool.turquoise.main,
                  color: "#ffffff",
                }}
              >
                {row.teacherName
                  ? row.teacherName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((v) => v[0]?.toUpperCase())
                      .join("")
                  : "NA"}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {row.teacherName || "None assigned"}
              </Typography>
            </Box>
          ),
        },
        {
          id: "status",
          label: "Status",
          render: (row: TeacherAssignmentRow) =>
            row.status === "ASSIGNED" ? (
              <Box
                sx={{
                  "& .MuiChip-label": {
                    fontSize: 0,
                    "&::after": {
                      content: '"Assigned"',
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    },
                  },
                }}
              >
                <StatusChip status="ACTIVE" />
              </Box>
            ) : (
              <Box
                sx={{
                  "& .MuiChip-root": {
                    bgcolor: "rgba(25, 118, 210, 0.10)",
                    color: "#1976d2",
                    borderColor: "rgba(25, 118, 210, 0.25)",
                  },
                  "& .MuiChip-label": {
                    fontSize: 0,
                    "&::after": {
                      content: '"Not Assigned"',
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    },
                  },
                }}
              >
                <StatusChip status="COMPLETED" />
              </Box>
            ),
        },
      ],
      sortOptions: [],
      uiPolicy: {
        emptyMessage: "No assignments found",
        errorFallbackMessage: "Failed to fetch teacher assignments.",
        retryLabel: "Retry",
      },
      actions: {
        rowActions: (row) => ({
          onEdit: () => {
            const params = new URLSearchParams();
            if (row.id != null) params.set("assignmentId", String(row.id));
            if (row.academicYearId != null) params.set("academicYearId", String(row.academicYearId));
            if (row.classId != null) params.set("classId", String(row.classId));
            if (row.classDivisionId != null) params.set("divisionId", String(row.classDivisionId));
            if (row.teacherId != null) params.set("teacherId", String(row.teacherId));
            if (row.class && row.class !== "-") params.set("className", row.class);
            if (row.division && row.division !== "-") params.set("divisionName", row.division);
            navigate(`/teacher-assignments/assign?${params.toString()}`);
          },
          onDelete: () => {
            if (!row.teacherId) {
              setSnackbarSeverity("error");
              setSnackbar("No assigned teacher to delete for this row.");
              return;
            }
            openDeleteConfirm(row);
          },
        }),
      },
    }),
    [navigate, openDeleteConfirm, setSnackbar, setSnackbarSeverity]
  );

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[{ title: "Assigned Class Teachers", path: "#" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by class, division, or teacher name"
                onAddClick={() => navigate("/teacher-assignments/assign")}
                addLabel="Assign New Teacher"
              />
            }
          />
          {isError && (
            <Box sx={{ m: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" color="error">
                {(error as Error)?.message || "Failed to fetch teacher assignments."}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                {listConfig.uiPolicy.retryLabel}
              </Button>
            </Box>
          )}
        </>
      }
    >
      <EntityTableSection<TeacherAssignmentRow>
        label="Teacher Assignments Directory"
        totalRows={totalRows}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(rows) => {
          setRowsPerPage(rows);
          setPage(0);
        }}
        columns={listConfig.columns}
        data={rows}
        loading={isLoading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        renderRowActions={(row) => <TableRowActions {...(listConfig.actions?.rowActions?.(row) || {})} />}
        stickyHeader
        size="small"
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(null)}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbar}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Please Confirm"
        message={`Are you sure you want to delete teacher ${rowToDelete?.teacherName || ""}?`}
        confirmLabel={deleteLoading ? "Deleting..." : "Confirm"}
        onConfirm={confirmDelete}
        onClose={closeDeleteConfirm}
        loading={deleteLoading}
      />
    </ListPageLayout>
  );
}
