import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Select, MenuItem } from "@mui/material";
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
import schoolClassService, { type SchoolClass } from "../../api/services/schoolClassService";

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
  const [classFilter, setClassFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  
  // Data for filters
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);

  // Actions state
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      setFiltersLoading(true);
      try {
        const data = await schoolClassService.getAll();
        setClasses(data);
      } catch (err: unknown) {
        console.error("Failed to fetch classes:", err);
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await teacherService.list({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
        class_id: classFilter ? Number(classFilter) : undefined,
        class_division_id: divisionFilter ? Number(divisionFilter) : undefined,
      });
      setTeachers(response.items);
      setTotal(response.total);
    } catch (err: unknown) {
      console.error("Failed to fetch teachers:", err);
      setError("Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, classFilter, divisionFilter]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  const handleClassChange = (val: string) => {
    setClassFilter(val);
    setDivisionFilter(""); // Reset division when class changes
    setPage(0);
  };

  const handleDivisionChange = (val: string) => {
    setDivisionFilter(val);
    setPage(0);
  };

  const divisionOptions = useMemo(() => {
    if (!classFilter) return [];
    const selectedClass = classes.find(c => String(c.id) === classFilter);
    if (!selectedClass || !selectedClass.divisions) return [];
    return selectedClass.divisions.map(d => ({ label: d.division_name, value: String(d.id) }));
  }, [classes, classFilter]);

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
              renderActions={
                <>
                  <Select
                    value={classFilter}
                    onChange={(e) => handleClassChange(e.target.value as string)}
                    displayEmpty
                    size="small"
                    sx={{
                      minWidth: { xs: "100%", sm: 180 },
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "15px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      },
                    }}
                  >
                    <MenuItem value="">
                      <Typography variant="body2" color="text.secondary">
                        All Classes
                      </Typography>
                    </MenuItem>
                    {classes.map((cls) => (
                      <MenuItem key={cls.id} value={String(cls.id)}>
                        {cls.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <Select
                    value={divisionFilter}
                    onChange={(e) => handleDivisionChange(e.target.value as string)}
                    displayEmpty
                    size="small"
                    disabled={!classFilter}
                    sx={{
                      minWidth: { xs: "100%", sm: 180 },
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "15px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      },
                    }}
                  >
                    <MenuItem value="">
                      <Typography variant="body2" color="text.secondary">
                        All Divisions
                      </Typography>
                    </MenuItem>
                    {divisionOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </>
              }
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
            onView: () => listConfig.actions!.rowActions!(row)?.onView?.(),
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
