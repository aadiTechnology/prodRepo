import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Link, Snackbar, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  EntityTableSection,
  ListPageLayout,
  ListPageToolbar,
  TableRowActions,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";
import { useTeacherStudentListScope } from "../../hooks/useTeacherStudentListScope";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../../utils/listPagination";
import { formatShortDate } from "../../utils/formatters";
import { isStudentHomeworkUser } from "../../utils/homeworkAudience";
import { isTeacherNoticeUser } from "../../utils/noticeAudience";
import syllabusService, {
  buildSyllabusAttachmentUrl,
  formatSyllabusMonthLabel,
  type Syllabus,
} from "../../api/services/syllabusService";

export default function SyllabusList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission, hasAnyRole, roles } = useRBAC();
  const teacherScope = useTeacherStudentListScope();

  const isAdmin = hasAnyRole(["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN", "TENANT_ADMIN"]);
  const isTeacher = !isAdmin && isTeacherNoticeUser(user?.role, roles);
  const isStudent = isStudentHomeworkUser(user?.role, roles);
  const canAdd = hasPermission("ACADEMIC_MGMT:create") && !isStudent;
  // Admin + Teacher can edit/delete; Student cannot.
  const canManage = (isAdmin || isTeacher) && !isStudent;
  const canEdit = canManage && (hasPermission("ACADEMIC_MGMT:edit") || canAdd);
  const canDelete = canManage && (hasPermission("ACADEMIC_MGMT:delete") || canAdd);

  const [items, setItems] = useState<Syllabus[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [month, setMonth] = useState("");
  const [yearOptions, setYearOptions] = useState<{ label: string; value: string }[]>([]);
  const [classOptions, setClassOptions] = useState<{ label: string; value: string }[]>([]);
  const [monthOptions, setMonthOptions] = useState<{ label: string; value: string }[]>([]);
  const [toDelete, setToDelete] = useState<Syllabus | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void syllabusService
      .getFilterOptions()
      .then((opts) => {
        if (cancelled) return;
        setYearOptions(opts.academic_years.map((y) => ({ label: y.name, value: String(y.id) })));
        setClassOptions(opts.classes.map((c) => ({ label: c.name, value: String(c.id) })));
        setMonthOptions(opts.months.map((m) => ({ label: formatSyllabusMonthLabel(m), value: m })));
        const current = opts.academic_years.find((y) => y.is_current);
        if (current) {
          setAcademicYearId((prev) => prev || String(current.id));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load syllabus filters");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scopedClassId =
    isTeacher && teacherScope.defaultClassId ? Number(teacherScope.defaultClassId) : undefined;

  const fetchList = useCallback(async () => {
    if (isTeacher && !teacherScope.scopeReady) return;
    try {
      setLoading(true);
      setError(null);
      const res = await syllabusService.list({
        page,
        size: rowsPerPage,
        search: debouncedSearch || undefined,
        academic_year_id: isAdmin && academicYearId ? Number(academicYearId) : undefined,
        class_id: isAdmin && classId ? Number(classId) : undefined,
        month: month || undefined,
        scoped_class_id: scopedClassId,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load syllabus");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    academicYearId,
    classId,
    debouncedSearch,
    isAdmin,
    isTeacher,
    month,
    page,
    rowsPerPage,
    scopedClassId,
    teacherScope.scopeReady,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, academicYearId, classId, month, scopedClassId]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      setDeleteLoading(true);
      await syllabusService.delete(toDelete.id);
      setSnackbar("Syllabus deleted successfully.");
      setToDelete(null);
      await fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete syllabus");
      setToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filters = useMemo(() => {
    const list: {
      label: string;
      value: string;
      onChange: (v: string) => void;
      options: { label: string; value: string }[];
      testId?: string;
    }[] = [];
    if (isAdmin) {
      list.push({
        label: "Academic Year",
        value: academicYearId,
        onChange: setAcademicYearId,
        options: yearOptions,
        testId: "filter-syllabus-academic-year",
      });
      list.push({
        label: "Class",
        value: classId,
        onChange: setClassId,
        options: classOptions,
        testId: "filter-syllabus-class",
      });
    }
    list.push({
      label: "Month",
      value: month,
      onChange: setMonth,
      options: monthOptions,
      testId: "filter-syllabus-month",
    });
    return list;
  }, [academicYearId, classId, classOptions, isAdmin, month, monthOptions, yearOptions]);

  const columns = useMemo(
    () => [
      { id: "month", label: "Month", render: (row: Syllabus) => formatSyllabusMonthLabel(row.month) },
      ...(isAdmin
        ? [{ id: "class_name", label: "Class", render: (row: Syllabus) => row.class_name }]
        : []),
      {
        id: "attachment",
        label: "Attachment",
        render: (row: Syllabus) =>
          row.attachment?.file_path ? (
            <Link
              href={buildSyllabusAttachmentUrl(row.attachment.file_path)}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              variant="body2"
              data-testid={`link-attachment-${row.id}`}
              sx={{ fontWeight: 600 }}
              onClick={(e) => e.stopPropagation()}
            >
              {row.attachment.file_name}
            </Link>
          ) : (
            "—"
          ),
      },
      {
        id: "upload_date",
        label: "Upload Date",
        render: (row: Syllabus) => formatShortDate(row.upload_date),
      },
    ],
    [isAdmin],
  );

  const showActions = canEdit || canDelete;

  return (
    <ListPageLayout
      data-testid="page-syllabus-list"
      header={
        <>
          <PageHeader
            links={[{ title: "Syllabus Management", path: "/academics/syllabus" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search month, class…"
                searchTestId="input-syllabus-search"
                onAddClick={canAdd ? () => navigate("/academics/syllabus/new") : undefined}
                addLabel="Add Syllabus"
                addButtonTestId="btn-add-syllabus"
                addIcon={<AddIcon sx={{ fontSize: 24 }} />}
                filters={filters}
              />
            }
          />
          {error ? (
            <Box sx={{ m: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => void fetchList()}
                data-testid="btn-retry-syllabus-list"
              >
                Retry
              </Button>
            </Box>
          ) : null}
        </>
      }
    >
      <EntityTableSection<Syllabus>
        label=""
        showInfoBar={false}
        totalRows={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => {
          setRowsPerPage(n);
          setPage(0);
        }}
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="No syllabus records found"
        getRowKey={(row) => row.id}
        data-testid="table-syllabus-list"
        rowTestId={(row) => `row-syllabus-${row.id}`}
        renderRowActions={
          showActions
            ? (row) => (
                <TableRowActions
                  onEdit={canEdit ? () => navigate(`/academics/syllabus/${row.id}/edit`) : undefined}
                  onDelete={canDelete ? () => setToDelete(row) : undefined}
                  editTestId={`btn-edit-syllabus-${row.id}`}
                  deleteTestId={`btn-delete-syllabus-${row.id}`}
                />
              )
            : undefined
        }
        stickyHeader
        size="small"
        showPagination={total > 0}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Please Confirm"
        message="Are you sure you want to delete this syllabus?"
        confirmLabel={deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={() => void confirmDelete()}
        onClose={() => setToDelete(null)}
        loading={deleteLoading}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(null)}
      >
        <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: "100%" }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
}
