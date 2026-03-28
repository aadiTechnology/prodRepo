import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";

import { apiClient } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import FeeInstallmentStatusChip from "../../components/fees/FeeInstallmentStatusChip";
import { colorTokens } from "../../tokens/colors";
import {
  ListPageLayout,
  DirectoryInfoBar,
  DataTable,
  TablePaginationBar,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";

type FeeInstallmentStatusValue = "Paid" | "Partial" | "Pending" | "Overdue";

interface FeeInstallmentStatusInstallment {
  fee_installment_id: number;
  installment: string;
  category: string;
  due_date: string;
  amount: number;
  paid: number;
  balance: number;
  status: FeeInstallmentStatusValue;
}

interface FeeInstallmentStatusSummary {
  total_due: number;
  total_paid: number;
  outstanding_balance: number;
}

interface FeeInstallmentStatusResponse {
  summary: FeeInstallmentStatusSummary;
  installments: FeeInstallmentStatusInstallment[];
}

interface StudentSearchItem {
  id: number;
  student_name: string;
  student_code?: string | null;
  admission_no?: string | null;
  roll_no?: string | null;
  class_id?: number | null;
  class_name?: string | null;
}

async function fetchFeeInstallmentStatus(params: {
  student_id: number;
  academic_year_id: number;
  tenant_id?: number;
  /** When set, backend only returns installments if the student belongs to this class */
  class_id?: number;
}): Promise<FeeInstallmentStatusResponse> {
  const res = await apiClient.get<FeeInstallmentStatusResponse>(
    "/api/fees/installment-status",
    { params }
  );
  return res.data;
}

async function searchStudents(params: {
  search?: string;
  class_id?: number;
  class_name?: string;
  limit?: number;
  tenant_id?: number;
}): Promise<StudentSearchItem[]> {
  const res = await apiClient.get<StudentSearchItem[]>(
    "/fees/installment-tracking/students",
    { params }
  );
  return res.data;
}

type ClassOption = { id: number; name: string };
type AcademicYearOption = { id: number; name: string };

function money(v: number) {
  return `₹${Number(v || 0).toLocaleString()}`;
}

const statusColors = {
  Paid: { bg: "#e8f5e9", text: "#2e7d32" },
  Partial: { bg: "#fff3e0", text: "#ed6c02" },
  Pending: { bg: "#fffde7", text: "#fbc02d" },
  Overdue: { bg: "#ffebee", text: "#d32f2f" },
};

export default function FeeInstallmentStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Use tenantId=1 as per user's hardcoded value in StudentFeeLedger.tsx
  const tenantId = user?.tenant_id || 1;

  const [classId, setClassId] = useState<number | "">("");
  const [academicYearId, setAcademicYearId] = useState<number | "">("");
  const [student, setStudent] = useState<StudentSearchItem | null>(null);

  // Auto-select from navigation state if available
  useEffect(() => {
    if (location.state) {
      const { student: navStudent, classId: navClassId, academicYearId: navAcademicYearId } = location.state as any;
      if (navStudent) setStudent(navStudent);
      if (navClassId) setClassId(navClassId);
      if (navAcademicYearId) setAcademicYearId(navAcademicYearId);
    }
    // eslint-disable-next-line
  }, []);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [years, setYears] = useState<AcademicYearOption[]>([]);

  const [allStudents, setAllStudents] = useState<StudentSearchItem[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchItem[] | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const studentSearchTimer = useRef<number | null>(null);

  const studentOptions =
    studentQuery.trim().length >= 1 ? (searchResults ?? []) : allStudents;

  const [data, setData] = useState<FeeInstallmentStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptRow, setReceiptRow] = useState<FeeInstallmentStatusInstallment | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        if (tenantId == null) {
          setError("Tenant is missing.");
          return;
        }
        setError(null);
        const [classRes, yearRes] = await Promise.all([
          apiClient.get("/api/classes", { params: { tenant_id: tenantId } }),
          apiClient.get("/api/academic-years", { params: { tenant_id: tenantId } }),
        ]);
        const classData = classRes.data as ClassOption[];
        const yearData = yearRes.data as AcademicYearOption[];
        
        // Deduplicate classes ONLY (per user request: "bro only do it for class")
        const uniqueClasses = Array.from(new Map(classData.map(c => [c.name, c])).values());

        setClasses(uniqueClasses);
        setYears(yearData ?? []);
        setAcademicYearId((prev) =>
          typeof prev !== "number" && yearData?.length ? yearData[0].id : prev
        );
      } catch (err) {
        console.error("Error fetching lookups:", err);
      }
    };
    fetchLookups();
  }, [tenantId]);

  // Fetch students - all students when no class selected, filtered by class when selected
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setStudentLoading(true);
        const selectedClass = classes.find(c => c.id === classId);
        const items = await searchStudents({
          search: "",
          class_name: selectedClass?.name, 
          tenant_id: tenantId,
          limit: 50,
        });
        setAllStudents(items ?? []);
      } catch (err) {
        console.error("Error fetching students:", err);
        setAllStudents([]);
      } finally {
        setStudentLoading(false);
      }
    };

    fetchStudents();
  }, [classId, tenantId]);

  useEffect(() => {
    if (!studentQuery || studentQuery.trim().length < 1) {
      setSearchResults(null);
      return;
    }
    if (studentSearchTimer.current) window.clearTimeout(studentSearchTimer.current);
    studentSearchTimer.current = window.setTimeout(async () => {
      try {
        setStudentLoading(true);
        const items = await searchStudents({
          search: studentQuery.trim(),
          class_id: typeof classId === "number" ? classId : undefined,
          tenant_id: tenantId,
          limit: 50,
        });
        setSearchResults(items ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setStudentLoading(false);
      }
    }, 250);
    return () => {
      if (studentSearchTimer.current) window.clearTimeout(studentSearchTimer.current);
    };
  }, [studentQuery, classId, tenantId]);

  const canFetch = Boolean(student?.id) && typeof academicYearId === "number";

  useEffect(() => {
    const run = async () => {
      if (!canFetch) {
        setData(null);
        setError(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await fetchFeeInstallmentStatus({
          student_id: student!.id,
          academic_year_id: academicYearId as number,
          tenant_id: tenantId,
          ...(typeof classId === "number" ? { class_id: classId } : {}),
        });
        setData(res);
      } catch (e: any) {
        setData(null);
        setError(e?.message || "Failed to load installment status.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [canFetch, student, academicYearId, tenantId, classId, location.key]);


  useEffect(() => {
    setPage(0);
  }, [academicYearId, student?.id, classId]);

  const installments: FeeInstallmentStatusInstallment[] = data?.installments ?? [];
  const summary = data?.summary;

  // Sort installments serialwise: 1st Quarter → 2nd → 3rd → 4th, then by category within each quarter
  const sortedInstallments = useMemo(() => {
    const getQuarterNum = (s: string) => {
      const m = s.match(/^(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    };
    return [...installments].sort((a, b) => {
      const qA = getQuarterNum(a.installment);
      const qB = getQuarterNum(b.installment);
      if (qA !== qB) return qA - qB;
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [installments]);

  const paginatedInstallments = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedInstallments.slice(start, start + rowsPerPage);
  }, [sortedInstallments, page, rowsPerPage]);

  const emptyState = useMemo(() => {
    if (typeof classId !== "number") return "Please select a class to view students";
    if (!student) return "Please select a student";
    if (typeof academicYearId !== "number") return "Please select academic year";
    return "No installment records found";
  }, [academicYearId, student, classId]);

  const rangeStart =
    sortedInstallments.length > 0
      ? Math.min(page * rowsPerPage + 1, sortedInstallments.length)
      : 0;
  const rangeEnd = Math.min((page + 1) * rowsPerPage, sortedInstallments.length);

  const handleCollectPaymentClick = () => {
    const firstUnpaid = sortedInstallments.find((r) => r.status !== "Paid");
    if (firstUnpaid && student && typeof academicYearId === "number") {
      // Navigate to collect payment page with student and installment data
      navigate("/fees/collect-payment", {
        state: {
          student,
          installment: firstUnpaid,
          academicYearId,
        },
      });
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "installment",
        label: "Installment",
        render: (r: FeeInstallmentStatusInstallment) => (
          <Typography sx={{ fontWeight: 600 }}>{r.installment}</Typography>
        ),
      },
      { id: "category", label: "Category", field: "category" as const },
      {
        id: "due_date",
        label: "Due Date",
        render: (r: FeeInstallmentStatusInstallment) =>
          new Date(r.due_date).toLocaleDateString(),
      },
      {
        id: "amount",
        label: "Amount",
        align: "right" as const,
        render: (r: FeeInstallmentStatusInstallment) => money(r.amount),
      },
      {
        id: "paid",
        label: "Paid",
        align: "right" as const,
        render: (r: FeeInstallmentStatusInstallment) => money(r.paid),
      },
      {
        id: "balance",
        label: "Balance",
        align: "right" as const,
        render: (r: FeeInstallmentStatusInstallment) => {
          const overdue = r.status === "Overdue" && r.balance > 0;
          return (
            <Typography
              sx={{
                fontWeight: 900,
                color: overdue ? colorTokens.preschool.coral.main : colorTokens.text.primary,
              }}
            >
              {money(r.balance)}
            </Typography>
          );
        },
      },
      {
        id: "status",
        label: "Status",
        align: "center" as const,
        render: (r: FeeInstallmentStatusInstallment) => (
          <FeeInstallmentStatusChip status={r.status} />
        ),
      },
    ],
    []
  );

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[{ title: "Fee Installment Status", path: "/fees/installment-status" }]}
            homePath="/"
            actions={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                  flex: 1,
                  justifyContent: "flex-end",
                }}
              >
                <Autocomplete
                  value={student}
                  options={studentOptions}
                  loading={studentLoading}
                  onChange={(_, v) => setStudent(v)}
                  inputValue={studentQuery}
                  onInputChange={(_, v) => setStudentQuery(v)}
                  disabled={typeof classId !== "number"}
                  noOptionsText={
                    typeof classId !== "number"
                      ? "Please select a class first"
                      : studentLoading
                        ? "Loading students..."
                        : "No students found"
                  }
                  getOptionLabel={(o) => {
                    const parts = [o.student_name];
                    if (o.roll_no) parts.push(`Roll: ${o.roll_no}`);
                    if (o.student_code) parts.push(`(${o.student_code})`);
                    if (o.class_name) parts.push(o.class_name);
                    if (o.admission_no) parts.push(o.admission_no);
                    return parts.join(" • ");
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ fontSize: "0.9rem" }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {option.student_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colorTokens.text.secondary }}>
                          {[
                            option.student_code && `Code: ${option.student_code}`,
                            option.roll_no && `Roll: ${option.roll_no}`,
                            option.admission_no && `Admission: ${option.admission_no}`,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  size="small"
                  sx={{ minWidth: 220 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={
                        typeof classId !== "number"
                          ? "Select a class first"
                          : "Search student..."
                      }
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: colorTokens.text.secondary, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          bgcolor: "#ffffff",
                          borderRadius: "15px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                        },
                      }}
                    />
                  )}
                />
                <FormControl size="small" sx={{ minWidth: 120, bgcolor: "#ffffff", borderRadius: "15px" }}>
                  <Select
                    displayEmpty
                    value={classId}
                    onChange={(e) => {
                      const v = e.target.value as number | "";
                      setClassId(v === "" ? "" : Number(v));
                      setStudent(null);
                    }}
                    sx={{ fontSize: "0.85rem", fontWeight: 600 }}
                    renderValue={(v) =>
                      (v as number | "") === ""
                        ? "All Classes"
                        : classes.find((c) => c.id === Number(v))?.name ?? "Class"
                    }
                  >
                    <MenuItem value="">
                      <em>All Classes</em>
                    </MenuItem>
                    {classes.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140, bgcolor: "#ffffff", borderRadius: "15px" }}>
                  <Select
                    displayEmpty
                    value={academicYearId}
                    onChange={(e) => {
                      const v = e.target.value as number | "";
                      setAcademicYearId(v === "" ? "" : Number(v));
                    }}
                    sx={{ fontSize: "0.85rem", fontWeight: 600 }}
                    renderValue={(v) =>
                      (v as number | "") === ""
                        ? "Academic Year"
                        : years.find((y) => y.id === Number(v))?.name ?? "Academic Year"
                    }
                  >
                    <MenuItem value="">
                      <em>Select Year</em>
                    </MenuItem>
                    {years.map((y) => (
                      <MenuItem key={y.id} value={y.id}>
                        {y.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<MonetizationOnOutlinedIcon />}
                  onClick={handleCollectPaymentClick}
                  disabled={!installments.some((r) => r.status !== "Paid")}
                  sx={{
                    borderRadius: "15px",
                    fontWeight: 800,
                    textTransform: "none",
                    background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                    boxShadow: `0 8px 16px rgba(0,0,0,0.15)`,
                    "&:hover": {
                      background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.dark} 0%, ${colorTokens.primary.dark} 100%)`,
                      boxShadow: `0 12px 20px rgba(0,0,0,0.2)`,
                    },
                  }}
                >
                  Collect Payment
                </Button>
              </Box>
            }
          />
          {error && (
            <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </>
      }
    >
      {student && (
        <Box
          sx={{
            py: 1.5,
            px: 3,
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
            alignItems: "center",
            borderBottom: `1px solid ${colorTokens.border.subtle}`,
            bgcolor: colorTokens.background.subtle,
          }}
        >
          <Typography variant="body2" sx={{ color: colorTokens.text.secondary, fontWeight: 600 }}>
            Student: <Box component="span" sx={{ color: colorTokens.text.primary, fontWeight: 800 }}>{student.student_name}</Box>
          </Typography>
          {student.roll_no && (
            <Typography variant="body2" sx={{ color: colorTokens.text.secondary, fontWeight: 600 }}>
              Roll No: <Box component="span" sx={{ color: colorTokens.text.primary, fontWeight: 800 }}>{student.roll_no}</Box>
            </Typography>
          )}
          {student.class_name && (
            <Typography variant="body2" sx={{ color: colorTokens.text.secondary, fontWeight: 600 }}>
              Class: <Box component="span" sx={{ color: colorTokens.text.primary, fontWeight: 800 }}>{student.class_name}</Box>
            </Typography>
          )}
        </Box>
      )}

      {!loading && installments.length > 0 && (
        <Box
          sx={{
            m: 2,
            p: 1.5,
            border: `1px solid ${colorTokens.border.subtle}`,
            borderRadius: "8px",
            bgcolor: "#ffffff",
            display: "inline-flex",
            gap: 3,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, color: colorTokens.text.secondary }}>
            Legend
          </Typography>
          <Box sx={{ height: 20, width: "1px", bgcolor: colorTokens.border.subtle }} />
          <Box sx={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "3px",
                  bgcolor: colorTokens.preschool.mint.main,
                }}
              />
              <Typography variant="caption" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                Paid
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "3px",
                  bgcolor: colorTokens.preschool.peach.main,
                }}
              />
              <Typography variant="caption" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                Partial
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "3px",
                  bgcolor: colorTokens.preschool.sunshine.main,
                }}
              />
              <Typography variant="caption" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                Pending
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "3px",
                  bgcolor: colorTokens.preschool.coral.dark,
                }}
              />
              <Typography variant="caption" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                Overdue
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {!loading && installments.length > 0 && (
        <DirectoryInfoBar
          label="Installment Status"
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={installments.length}
        />
      )}

      {!loading && installments.length > 0 && summary && (
        <Box
          sx={{
            py: 1,
            px: 3,
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
            borderBottom: `1px solid ${colorTokens.border.subtle}`,
            bgcolor: colorTokens.background.subtle,
          }}
        >
          <Typography variant="body2" sx={{ color: colorTokens.text.secondary }}>
            Total Due: <strong>{money(summary.total_due)}</strong>
          </Typography>
          <Typography variant="body2" sx={{ color: colorTokens.text.secondary }}>
            Total Paid: <strong>{money(summary.total_paid)}</strong>
          </Typography>
          <Typography variant="body2" sx={{ color: colorTokens.text.secondary }}>
            Outstanding: <strong>{money(summary.outstanding_balance)}</strong>
          </Typography>
        </Box>
      )}

      <DataTable<FeeInstallmentStatusInstallment>
        columns={columns}
        data={paginatedInstallments}
        loading={loading}
        emptyMessage={emptyState}
        getRowKey={(row) => row.fee_installment_id}
        getRowSx={(row) => {
          const colors = statusColors[row.status as keyof typeof statusColors];
          return colors ? { bgcolor: colors.bg, "&:hover": { bgcolor: colors.bg } } : {};
        }}
        renderRowActions={(row) => (
          <Box sx={{ display: "flex", gap: 1 }}>
            {row.status === "Paid" ? (
              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setReceiptRow(row);
                  setReceiptOpen(true);
                }}
                sx={{
                  fontWeight: 900,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Receipt
              </Link>
            ) : (
              <Button
                variant="contained"
                size="small"
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800, fontSize: "0.75rem" }}
                onClick={() => {
                  if (student && typeof academicYearId === "number") {
                    navigate("/fees/collect-payment", {
                      state: {
                        student,
                        installment: row,
                        academicYearId,
                      },
                    });
                  }
                }}
              >
                Collect
              </Button>
            )}
          </Box>
        )}
        stickyHeader
        size="small"
      />

      {!loading && installments.length > 0 && (
        <TablePaginationBar
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={installments.length}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => {
            setRowsPerPage(v);
            setPage(0);
          }}
        />
      )}

      <Dialog open={receiptOpen} onClose={() => setReceiptOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Receipt</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            This is a receipt preview. For a printable receipt/PDF, we'll need a payment receipt API
            that returns a payment id.
          </Alert>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 900 }}>
              {receiptRow ? `${receiptRow.installment} • ${receiptRow.category}` : "-"}
            </Typography>
            <Typography variant="body2" sx={{ color: colorTokens.text.secondary }}>
              Amount: {money(receiptRow?.amount ?? 0)} • Paid: {money(receiptRow?.paid ?? 0)}
            </Typography>
            <Typography variant="body2" sx={{ color: colorTokens.text.secondary }}>
              Due Date: {receiptRow ? new Date(receiptRow.due_date).toLocaleDateString() : "-"}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setReceiptOpen(false)}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 900 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ListPageLayout>
  );
}
