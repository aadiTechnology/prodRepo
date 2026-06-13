import React, { useMemo, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { useStudentListController } from "../../hooks/useStudentListController";
import { useTeacherStudentListScope } from "../../hooks/useTeacherStudentListScope";
import { createStudentListConfig, renderStudentRowActions } from "./StudentList.listConfig";

const StudentList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const fromConfigHub = location.state?.fromConfigHub;

  const breadcrumbLinks = fromConfigHub
    ? [
        { title: "Basic Configuration", path: "/configuration" },
        { title: "Student Management", path: "#" },
      ]
    : [{ title: "Student Management", path: "#" }];

  const {
    isTeacherScoped,
    scopeReady,
    defaultClassId,
    teacherClassOptions,
  } = useTeacherStudentListScope();

  const [classOptions, setClassOptions] = useState([{ value: '', label: 'All' }]);
  useEffect(() => {
    if (isTeacherScoped) {
      if (!scopeReady) return;
      setClassOptions([
        { value: '', label: 'All Classes' },
        ...teacherClassOptions,
      ]);
      return;
    }

    async function fetchClasses() {
      try {
        const schoolClassService = (await import("../../api/services/schoolClassService")).default;
        const classes = await schoolClassService.getAll();
        setClassOptions([
          { value: '', label: 'All Classes' },
          ...classes.map((c: any) => ({ value: String(c.id), label: String(c.name) }))
        ]);
      } catch (e) {
        setClassOptions([{ value: '', label: 'All Classes' }]);
      }
    }
    fetchClasses();
  }, [isTeacherScoped, scopeReady, teacherClassOptions]);
  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];
  const [selectedClass, setSelectedClass] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [classFilterInitialized, setClassFilterInitialized] = React.useState(false);

  useEffect(() => {
    if (!scopeReady || classFilterInitialized) return;
    if (isTeacherScoped && defaultClassId) {
      setSelectedClass(defaultClassId);
    }
    setClassFilterInitialized(true);
  }, [scopeReady, classFilterInitialized, isTeacherScoped, defaultClassId]);

  const listReady = scopeReady && classFilterInitialized;
  const {
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
    sortedStudents,
    totalStudents,
    loading,
    error,
    snackbar,
    fetchStudents,
    closeSnackbar,
    confirmDialogOpen,
    studentToDelete,
    deleteLoading,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
  } = useStudentListController({
    navigate,
    classFilter: selectedClass,
    statusFilter: selectedStatus,
    ready: listReady,
  });

  // Debug: log student data to verify roll_no is present
  useEffect(() => {
    if (sortedStudents && sortedStudents.length > 0) {
      console.log('Student List Data:', sortedStudents);
    }
  }, [sortedStudents]);

  const listConfig = useMemo(
    () =>
      createStudentListConfig({
        navigate,
        onDeleteClick: openDeleteConfirm,
      }),
    [navigate, openDeleteConfirm]
  );

  return (
    <ListPageLayout
      header={
        <>
          {/* Filters and Toolbar Row */}
          <PageHeader
            links={breadcrumbLinks}
            homePath="/"
            actions={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box>
                  <Select
                    size="small"
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value)}
                    sx={{ minWidth: 140 }}
                    displayEmpty
                  >
                    {classOptions.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label === 'All' ? 'All Classes' : opt.label}</MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box>
                  <Select
                    size="small"
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    sx={{ minWidth: 120 }}
                    displayEmpty
                  >
                    {statusOptions.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label === 'All' ? 'All Statuses' : opt.label}</MenuItem>
                    ))}
                  </Select>
                </Box>
                <ListPageToolbar
                  searchValue={search}
                  onSearchChange={onSearchChange}
                  searchPlaceholder="Search students..."
                  onAddClick={() => navigate("/students/add")}
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
        label="Student Directory"
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
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Please Confirm"
        message={`Are you sure you want to delete student ${studentToDelete?.name}?`}
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
        message={snackbar}
      />
    </ListPageLayout>
  );
};

export default StudentList;
