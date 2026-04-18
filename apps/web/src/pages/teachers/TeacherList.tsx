import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import { Box, Typography } from "../../components/primitives";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import teacherService, { type TeacherResponse } from "../../api/services/teacherService";
import { createTeacherListConfig, renderTeacherRowActions } from "./TeacherList.listConfig";
// import schoolClassService from "../../../api/services/schoolClassService"; // For class filter if needed in future

export default function TeacherList() {
  const navigate = useNavigate();

  // State
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // List configuration state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Actions state
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await teacherService.list({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
      });
      setTeachers(response.items);
      setTotal(response.total);
    } catch (err: unknown) {
      console.error("Failed to fetch teachers:", err);
      setError("Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  const handleToggleStatus = async (teacher: TeacherResponse) => {
    setToggleLoadingId(teacher.id);
    try {
      await teacherService.toggleStatus(teacher.id);
      await fetchTeachers();
    } catch (err: unknown) {
      console.error("Failed to toggle status:", err);
      // We could use a snackbar here, but for simplicity just log
    } finally {
      setToggleLoadingId(null);
    }
  };

  const openDeleteConfirm = (teacher: TeacherResponse) => {
    setTeacherToDelete(teacher);
    setConfirmDialogOpen(true);
  };

  const closeDeleteConfirm = () => {
    setTeacherToDelete(null);
    setConfirmDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!teacherToDelete) return;
    setDeleteLoading(true);
    try {
      await teacherService.delete(teacherToDelete.id);
      await fetchTeachers();
      closeDeleteConfirm();
    } catch (err: unknown) {
      console.error("Failed to delete teacher:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const listConfig = useMemo(
    () =>
      createTeacherListConfig({
        navigate,
        onDeleteClick: openDeleteConfirm,
        onToggleStatusClick: handleToggleStatus,
        toggleLoadingId,
      }),
    [navigate, toggleLoadingId]
  );

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[{ title: "Teacher Management", path: "#" }]}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={search}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search by name, ID or mobile"
              onAddClick={() => navigate("/teachers/add")}
              addLabel="Add Teacher"
            />
          }
        />
      }
    >
      {error && (
        <Box sx={{ m: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <EntityTableSection<TeacherResponse>
        label="Teacher Directory"
        totalRows={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        columns={listConfig.columns}
        data={teachers}
        loading={loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        renderRowActions={(row: TeacherResponse) =>
          renderTeacherRowActions({
            row,
            toggleLoadingId,
            onEdit: () => listConfig.actions!.rowActions!(row)?.onEdit?.(),
            onDelete: () => listConfig.actions!.rowActions!(row)?.onDelete?.(),
            onToggleStatus: () => handleToggleStatus(row),
          })
        }
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Confirm Delete"
        message={`Are you sure you want to delete teacher ${teacherToDelete?.full_name}?`}
        confirmLabel={deleteLoading ? "Deleting..." : "Delete"}
        onConfirm={confirmDelete}
        onClose={closeDeleteConfirm}
        loading={deleteLoading}
      />
    </ListPageLayout>
  );
}
