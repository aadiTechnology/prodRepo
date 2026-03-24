

import { useState, useEffect } from "react";
import { Box, Typography, Card, CardContent, Grid, Chip, Button, Snackbar, CircularProgress, Alert, Stack } from "@mui/material";
import DataTable, { DataTableColumn } from "../components/reusable/DataTable";
import TablePaginationBar from "../components/reusable/TablePaginationBar";
import "./StudentFeeLedger.css";
import { Download as DownloadIcon, CheckCircle, ErrorOutline, MonetizationOn, Payment } from "@mui/icons-material";
import StudentDropdown from "../components/StudentDropdown";
import { fetchFeeLedger, downloadFeeLedger } from "../api/studentFeeLedger";

const tenantId = 1; // Replace with actual tenantId from auth/session

function getQuarterName(dateStr: string) {
  const date = new Date(dateStr);
  const month = date.getMonth();
  if (month < 3) return "1ST QUARTER";
  if (month < 6) return "2ND QUARTER";
  if (month < 9) return "3RD QUARTER";
  return "4TH QUARTER";
}

function groupByQuarter(installments: any[]) {
  const groups: Record<string, any[]> = {};
  installments.forEach(inst => {
    const q = getQuarterName(inst.due_date);
    if (!groups[q]) groups[q] = [];
    groups[q].push(inst);
  });
  return groups;
}

const statusColor = (status: string) => {
  if (status === "PAID") return "success";
  if (status === "OVERDUE") return "error";
  if (status === "PARTIAL") return "warning";
  return "default";
};

const StudentFeeLedger = () => {
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (!selectedStudent?.value) {
      setLedger(null);
      return;
    }
    setLoading(true);
    setError(null);
    // Always use a valid academic_year, fallback to '2025-26' if not present
    const academicYear = selectedStudent.academic_year || '2025-26';
    console.log("Fetching fee ledger for studentId:", selectedStudent.value, "academic_year:", academicYear);
    fetchFeeLedger(selectedStudent.value, academicYear, tenantId)
      .then((data) => {
        console.log("Fee ledger API response:", data);
        setLedger(data);
        if (!data) {
          setError("No fee ledger data found for the selected student.");
        }
      })
      .catch(() => setError("Failed to fetch fee ledger."))
      .finally(() => setLoading(false));
  }, [selectedStudent]);

  const handleDownload = async () => {
    if (!selectedStudent?.value) {
      setError("Please select a student");
      return;
    }
    setError(null);
    setLoading(true);
    await downloadFeeLedger(selectedStudent.value, tenantId);
    setLoading(false);
    setSnackbar("Ledger downloaded");
  };

  // Summary values
  const totalFee = ledger?.summary?.total_fee ?? 0;
  const totalPaid = ledger?.summary?.total_paid ?? 0;
  const pending = ledger?.summary?.outstanding ?? 0;

  // Table columns for fee ledger
  const columns: DataTableColumn<any>[] = [
    { id: "installment", label: "Installment", field: "installment", align: "center" },
    { id: "category", label: "Category", field: "category", align: "center" },
    { id: "due_date", label: "Due Date", field: "due_date", align: "center" },
    { id: "amount", label: "Amount", align: "center", render: (row) => `₹${row.amount?.toLocaleString() ?? "0"}` },
    { id: "paid", label: "Paid", align: "center", render: (row) => `₹${row.paid?.toLocaleString() ?? "0"}` },
    { id: "balance", label: "Balance", align: "center", render: (row) => `₹${row.balance?.toLocaleString() ?? "0"}` },
    { id: "status", label: "Status", align: "center", render: (row) => (
      <Chip
        label={row.status}
        color={row.status === "PAID" ? "success" : row.status === "OVERDUE" ? "error" : row.status === "PARTIAL" ? "warning" : "default"}
        size="small"
        sx={{ fontWeight: 700, fontSize: 13 }}
      />
    ) },
  ];

  // Pagination logic
  const pagedInstallments = ledger?.installments?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) ?? [];
  const totalRows = ledger?.installments?.length ?? 0;

  return (
    <>
      {/* Top Bar with Title, Student Dropdown, and Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>Student Fee Ledger</Typography>
          <Typography variant="body2" color="text.secondary">
            View a student's complete fee history including installments, payments, and outstanding balances.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Student Search Dropdown moved to top bar */}
          <StudentDropdown onSelect={setSelectedStudent} tenantId={tenantId} />
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={loading || !selectedStudent?.value}
          >
            Download Ledger
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<Payment />}
            disabled={!selectedStudent?.value}
          >
            Pay Fee
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2} mb={2} alignItems="stretch">
        {/* Student Info/Profile (left side) */}
        <Grid item xs={12} md={5} lg={4}>
          {/* Student Info Card only if student selected */}
          {ledger?.student && (
            <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%', display: 'flex', alignItems: 'center', px: 2, py: 2 }}>
              <Box display="flex" alignItems="center" width="100%">
                <Box flex={1} minWidth={0}>
                  <Typography variant="h6" fontWeight={700} noWrap>{ledger.student.student_name}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>Student ID: {ledger.student.student_code || '-'}</Typography>
                  <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                    <Box px={1.5} py={0.5} bgcolor="#e6e9f0" borderRadius={1} fontSize={13} fontWeight={600} color="#3b3b3b">
                      Academic Year {ledger.student.academic_year}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Card>
          )}
        </Grid>
        {/* Summary Cards */}
        <Grid item xs={12} md={7} lg={8}>
          <Grid container spacing={2} height="100%">
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <MonetizationOn color="primary" fontSize="large" />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>Total Fee</Typography>
                      <Typography variant="h6" fontWeight={800}>₹{totalFee.toLocaleString()}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CheckCircle color="success" fontSize="large" />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>Total Paid</Typography>
                      <Typography variant="h6" fontWeight={800} color="success.main">₹{totalPaid.toLocaleString()}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <ErrorOutline color="error" fontSize="large" />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>Pending</Typography>
                      <Typography variant="h6" fontWeight={800} color="error.main">₹{pending.toLocaleString()}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      {/* Filter Card removed as per request (search moved to left card) */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Box textAlign="center" py={4}><CircularProgress /></Box>}
      {/* Student Info Section below removed, info is now in left card */}
      {/* Installment Ledger Table (refactored to match TenantList) */}
      <Box mb={4}>
        <Box
          sx={{
            bgcolor: "primary.main",
            color: "white",
            px: 2,
            py: 1,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: 1,
            mb: 0,
          }}
        >
          Installment Ledger
        </Box>
        <Box sx={{ overflowX: "auto", bgcolor: "#f6fafd", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <DataTable
            columns={columns}
            data={pagedInstallments}
            loading={loading}
            emptyMessage={<Typography align="center" color="text.secondary" mt={4}>No fee ledger found</Typography>}
            stickyHeader
            size="small"
            maxHeight={420}
          />
        </Box>
        <TablePaginationBar
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={totalRows}
          onPageChange={setPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        />
      </Box>
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </>
  );
};

export default StudentFeeLedger;
