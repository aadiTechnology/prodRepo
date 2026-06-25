import { useState, useEffect, useMemo, useCallback } from "react";
import { Add as AddIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../../utils/listPagination";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import teacherService, { type TeacherResponse } from "../../api/services/teacherService";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import { createTeacherListConfig } from "./TeacherList.listConfig";
import schoolClassService, { type SchoolClass } from "../../api/services/schoolClassService";
import { formatClassDisplayLabel } from "../../utils/formatters";

export default function TeacherList() {
  const { enqueueSnackbar } = useSnackbar();
  const { buildListBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();

  const breadcrumbLinks = buildListBreadcrumbs("Teachers");

  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [classFilter, setClassFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");

  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!success) return;
    enqueueSnackbar(success, {
      variant: "success",
      autoHideDuration: 3000,
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
    setSuccess(null);
  }, [success, enqueueSnackbar]);

  useEffect(() => {
    if (!error) return;
    enqueueSnackbar(error, {
      variant: "error",
      autoHideDuration: 4000,
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
    setError(null);
  }, [error, enqueueSnackbar]);

  useEffect(() => {
    schoolClassService
      .getAll()
      .then(setClasses)
      .catch(() => setError("Failed to load class filters."));
  }, []);

  const classOptions = useMemo(
    () =>
      classes.map((cls) => ({
        label: formatClassDisplayLabel(cls.name) || String(cls.id),
        value: String(cls.id),
      })),
    [classes]
  );

  const divisionOptions = useMemo(() => {
    if (!classFilter) return [];
    const selectedClass = classes.find((c) => String(c.id) === classFilter);
    if (!selectedClass?.divisions?.length) return [];
    return selectedClass.divisions.map((d) => ({
      label: formatClassDisplayLabel(d.division_name) || d.division_name,
      value: String(d.id),
    }));
  }, [classes, classFilter]);

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
    } catch {
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
    setDivisionFilter("");
    setPage(0);
  };

  const handleDivisionChange = (val: string) => {
    setDivisionFilter(val);
    setPage(0);
  };

  const handleDeleteClick = (teacher: TeacherResponse) => {
    setTeacherToDelete(teacher);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!teacherToDelete) return;
    setDeleteLoading(true);
    try {
      await teacherService.delete(teacherToDelete.id);
      setSuccess("Teacher deleted successfully.");
      setDeleteDialogOpen(false);
      setTeacherToDelete(null);
      fetchTeachers();
    } catch {
      setError("Failed to delete teacher.");
      setDeleteDialogOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const listConfig = useMemo(
    () =>
      createTeacherListConfig({
        navigate: navigateWithConfigHub,
        onDeleteClick: handleDeleteClick,
      }),
    [navigateWithConfigHub]
  );

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      header={
        <PageHeader
          links={breadcrumbLinks}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={search}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search teachers..."
              filters={[
                {
                  label: "Class",
                  value: classFilter,
                  onChange: handleClassChange,
                  options: classOptions,
                },
                {
                  label: "Division",
                  value: divisionFilter,
                  onChange: handleDivisionChange,
                  options: divisionOptions,
                  disabled: !classFilter,
                },
              ]}
              onAddClick={() => navigateWithConfigHub("/teachers/add")}
              addLabel="Add Teacher"
              addIcon={<AddIcon sx={{ fontSize: 24 }} />}
            />
          }
        />
      }
    >
      <EntityTableSection<TeacherResponse>
        label="Teachers"
        showInfoBar={false}
        totalRows={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        columns={listConfig.columns}
        data={teachers}
        loading={loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        rowActions={listConfig.actions.rowActions}
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Please Confirm"
        message="Are you sure you want to delete this teacher?"
        confirmText={deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteLoading}
      />
    </ListPageLayout>
  );
}
