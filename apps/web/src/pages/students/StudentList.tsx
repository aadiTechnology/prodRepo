import React, { useMemo, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  Button,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { useStudentListController } from "../../hooks/useStudentListController";
import { createStudentListConfig, renderStudentRowActions } from "./StudentList.listConfig";
import studentService from "../../api/services/studentService";
import type { Student } from "../../types/student";

const StudentList = () => {
    // Mock values for summary cards (replace with real API calls as needed)
    const averageAttendance = 94.8; // %
    const graduationRate = 92; // %
    const pendingEnrollment = 12; // count
  const navigate = useNavigate();
  // Fetch all class options from backend (schoolClassService)
  const [classOptions, setClassOptions] = useState([{ value: '', label: 'All' }]);
  useEffect(() => {
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
  }, []);
  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];
  const [selectedClass, setSelectedClass] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');
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
  });

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
            links={[{ title: "Student Management", path: "#" }]}
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
          {/* Summary Cards Row (now below search bar) */}
          <Box sx={{ mb: 3, mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>TOTAL STUDENTS</Typography>
                    <Typography variant="h5" fontWeight={800}>{totalStudents.toLocaleString()}</Typography>
                    <Typography variant="caption" color="success.main">↑ 2.3% from last term</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>AVERAGE ATTENDANCE</Typography>
                    <Typography variant="h5" fontWeight={800} color="success.main">{averageAttendance}%</Typography>
                    <Typography variant="caption" color="success.main">● Above target</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>GRADUATION RATE</Typography>
                    <Typography variant="h5" fontWeight={800}>{graduationRate}%</Typography>
                    <Typography variant="caption" color="text.secondary">● Class of 2024</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>PENDING ENROLLMENT</Typography>
                    <Typography variant="h5" fontWeight={800} color="error.main">{pendingEnrollment}</Typography>
                    <Typography variant="caption" color="error.main">● Requires action</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
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
            onEdit: () => navigate(`/students/${row.id}/edit`),
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
