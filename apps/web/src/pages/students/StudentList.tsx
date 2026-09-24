import React, { useMemo, useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import type { SchoolClass } from "../../api/services/schoolClassService";
import academicYearService from "../../api/services/academicYearService";
import { useStudentListController } from "../../hooks/useStudentListController";
import { useTeacherStudentListScope } from "../../hooks/useTeacherStudentListScope";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import { createStudentListConfig, renderStudentRowActions } from "./StudentList.listConfig";
import {
  LIST_ROWS_PER_PAGE_OPTIONS,
  shouldShowStandardListPagination,
} from "../../utils/listPagination";
import { resolveCurrentAcademicYearId } from "../../utils/academicYear";

const StudentList = () => {
  const navigate = useNavigate();
  const { buildListBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();

  const breadcrumbLinks = buildListBreadcrumbs("Student Management");
  const {
    isTeacherScoped,
    scopeReady,
    defaultClassId,
    defaultDivisionId,
    teacherClassOptions,
    teacherClasses,
  } = useTeacherStudentListScope();

  const [academicYearOptions, setAcademicYearOptions] = useState([{ value: "", label: "All Academic Years" }]);
  const [adminClasses, setAdminClasses] = useState<SchoolClass[]>([]);
  const [academicYearReady, setAcademicYearReady] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");

  useEffect(() => {
    academicYearService
      .listActive()
      .then((years) => {
        setAcademicYearOptions([
          { value: "", label: "All Academic Years" },
          ...years.map((y) => ({ value: String(y.id), label: y.name })),
        ]);
        const currentYearId = resolveCurrentAcademicYearId(years);
        setSelectedAcademicYear((prev) => prev || currentYearId);
        setAcademicYearReady(true);
      })
      .catch(() => {
        setAcademicYearOptions([{ value: "", label: "All Academic Years" }]);
        setAcademicYearReady(true);
      });
  }, []);

  useEffect(() => {
    if (isTeacherScoped) return;

    async function fetchClasses() {
      try {
        const schoolClassService = (await import("../../api/services/schoolClassService")).default;
        const classes = await schoolClassService.getAll();
        setAdminClasses(classes);
      } catch {
        setAdminClasses([]);
      }
    }
    void fetchClasses();
  }, [isTeacherScoped]);

  const statusOptions = [
    { value: "", label: "All" },
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ];

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Active");
  const [filterInitialized, setFilterInitialized] = useState(false);

  useEffect(() => {
    if (!scopeReady || filterInitialized) return;
    if (isTeacherScoped && defaultClassId) {
      setSelectedClass(defaultClassId);
      if (defaultDivisionId) {
        setSelectedDivision(defaultDivisionId);
      }
    }
    setFilterInitialized(true);
  }, [scopeReady, filterInitialized, isTeacherScoped, defaultClassId, defaultDivisionId]);

  const classesWithDivisions = isTeacherScoped ? teacherClasses : adminClasses;

  const classesForAcademicYear = useMemo(() => {
    if (!selectedAcademicYear) return classesWithDivisions;
    return classesWithDivisions.filter(
      (c) => c.academic_year_id != null && String(c.academic_year_id) === selectedAcademicYear
    );
  }, [classesWithDivisions, selectedAcademicYear]);

  const classOptions = useMemo(
    () => [
      { value: "", label: "All Classes" },
      ...classesForAcademicYear.map((c) => ({ value: String(c.id), label: String(c.name) })),
    ],
    [classesForAcademicYear]
  );

  const divisionOptions = useMemo(() => {
    if (!selectedClass) return [];
    const selected = classesForAcademicYear.find((c) => String(c.id) === selectedClass);
    if (!selected?.divisions?.length) return [];
    return selected.divisions.map((d) => ({
      value: String(d.id),
      label: d.division_name,
    }));
  }, [classesForAcademicYear, selectedClass]);

  useEffect(() => {
    if (!selectedClass || !selectedAcademicYear) return;
    const match = classesForAcademicYear.some((c) => String(c.id) === selectedClass);
    if (!match) {
      setSelectedClass("");
      setSelectedDivision("");
    }
  }, [selectedAcademicYear, selectedClass, classesForAcademicYear]);

  useEffect(() => {
    if (!filterInitialized || !selectedDivision) return;
    if (!selectedClass) {
      setSelectedDivision("");
      return;
    }
    const validIds = divisionOptions.map((opt) => opt.value);
    if (!validIds.includes(selectedDivision)) {
      setSelectedDivision("");
    }
  }, [selectedClass, selectedDivision, divisionOptions, filterInitialized]);

  const listReady = scopeReady && filterInitialized && academicYearReady;
  const {
    listState: {
      search,
      onSearchChange,
      page,
      setPage,
      rowsPerPage,
      onRowsPerPageChange,
    },
    sortedStudents,
    totalStudents,
    loading,
    error,
    fetchStudents,
    confirmDialogOpen,
    studentToDelete,
    deleteLoading,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
  } = useStudentListController({
    navigate,
    classFilter: selectedClass,
    divisionFilter: selectedDivision,
    statusFilter: selectedStatus,
    academicYearFilter: selectedAcademicYear,
    ready: listReady,
  });

  const handleClassChange = useCallback(
    (value: string) => {
      setSelectedClass(value);
      setSelectedDivision("");
      setPage(0);
    },
    [setPage]
  );

  const handleDivisionChange = useCallback(
    (value: string) => {
      setSelectedDivision(value);
      setPage(0);
    },
    [setPage]
  );

  const listConfig = useMemo(
    () =>
      createStudentListConfig({
        navigate: navigateWithConfigHub,
        onDeleteClick: openDeleteConfirm,
      }),
    [navigateWithConfigHub, openDeleteConfirm]
  );

  return (
    <ListPageLayout
      onRefresh={() => fetchStudents({ silent: true })}
      header={
        <>
          <PageHeader
            links={breadcrumbLinks}
            homePath="/"
            actions={
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box>
                  <Select
                    size="small"
                    value={selectedAcademicYear}
                    onChange={(e) => {
                      setSelectedAcademicYear(e.target.value);
                      setSelectedClass("");
                      setSelectedDivision("");
                      setPage(0);
                    }}
                    sx={{ minWidth: 150 }}
                    displayEmpty
                  >
                    {academicYearOptions.map((opt) => (
                      <MenuItem key={opt.value || "all-ay"} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box>
                  <Select
                    size="small"
                    value={selectedClass}
                    onChange={(e) => handleClassChange(e.target.value)}
                    sx={{ minWidth: 140 }}
                    displayEmpty
                  >
                    {classOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label === "All" ? "All Classes" : opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box>
                  <Select
                    size="small"
                    value={selectedDivision}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    sx={{ minWidth: 140 }}
                    displayEmpty
                    disabled={!selectedClass}
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
                </Box>
                <Box>
                  <Select
                    size="small"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    sx={{ minWidth: 120 }}
                    displayEmpty
                  >
                    {statusOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label === "All" ? "All Statuses" : opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <ListPageToolbar
                  searchValue={search}
                  onSearchChange={onSearchChange}
                  searchPlaceholder="Search students..."
                  onAddClick={() =>
                    navigateWithConfigHub("/admissions/enrollment?source=students")
                  }
                  addLabel="Add Student"
                  filters={[]}
                />
              </Box>
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
                onClick={() => void fetchStudents()}
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
        label="Student List"
        showInfoBar={false}
        totalRows={totalStudents}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={onRowsPerPageChange}
        columns={listConfig.columns}
        data={sortedStudents}
        loading={loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        renderRowActions={(row) =>
          renderStudentRowActions({
            row,
            onView: () => {
              const studentId = String((row as any).id ?? (row as any).student_id ?? "");
              if (!studentId) return;
              navigate(`/students/${studentId}/view?mode=view&source=students`);
            },
            onEdit: () => {
              const studentId = String((row as any).id ?? (row as any).student_id ?? "");
              if (!studentId) return;
              navigate(`/admissions/enrollment?studentId=${studentId}&mode=edit&source=students`);
            },
            onDelete: () => openDeleteConfirm(row),
          })
        }
        stickyHeader
        size="small"
        showPagination={shouldShowStandardListPagination(totalStudents)}
        rowsPerPageOptions={LIST_ROWS_PER_PAGE_OPTIONS}
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Please Confirm"
        message={
          studentToDelete &&
          (studentToDelete.class_id != null ||
            (studentToDelete.class && studentToDelete.class !== "Unknown"))
            ? "Assigned class for this student. Are you sure you want to delete this student?"
            : `Are you sure you want to delete student ${studentToDelete?.name}?`
        }
        confirmLabel={deleteLoading ? "Deleting..." : "Confirm"}
        onConfirm={confirmDelete}
        onClose={closeDeleteConfirm}
        loading={deleteLoading}
      />
    </ListPageLayout>
  );
};

export default StudentList;
