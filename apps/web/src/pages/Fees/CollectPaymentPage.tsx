import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, alpha, Box, CircularProgress, IconButton, Switch, Tooltip, Typography } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { useState, useEffect } from "react";
import { Cancel as CancelIcon, Save as SaveIcon } from "@mui/icons-material";
import { useAuth } from "../../context";

import { collectFeePayment } from "../../api/services/feeCollectionService";
import { colorTokens } from "../../tokens/colors";
import { ListPageLayout } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import { Button, MenuItem, Select, TextField } from "../../components/primitives";

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

interface StudentSearchItem {
  id: number;
  student_name: string;
  student_code?: string | null;
  admission_no?: string | null;
  roll_no?: string | null;
  class_id?: number | null;
  class_name?: string | null;
}

function money(v: number) {
  return `₹${Number(v || 0).toLocaleString()}`;
}

const buildFieldSx = (hasError: boolean) => (theme: Theme) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    bgcolor: "#ffffff",
    fontSize: "0.875rem",
    fontWeight: 500,
    transition: "all 0.2s ease-in-out",
    "& fieldset": {
      borderColor: hasError ? colorTokens.preschool.coral.main : colorTokens.border.subtle,
      borderWidth: "1.5px",
    },
    "&:hover fieldset": {
      borderColor: hasError ? colorTokens.preschool.coral.main : colorTokens.preschool.turquoise.main,
    },
    "&.Mui-focused": {
      boxShadow: `0 0 0 3px ${alpha(colorTokens.preschool.turquoise.main, 0.1)}`,
      "& fieldset": {
        borderColor: colorTokens.preschool.turquoise.main,
        borderWidth: "2px",
      },
    },
    "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: theme.palette.grey[500] },
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: alpha(colorTokens.text.primary, 0.6),
    "&.Mui-focused": {
      color: colorTokens.preschool.turquoise.dark,
    },
  },
  "& .MuiFormLabel-asterisk": {
    color: `${colorTokens.preschool.coral.main} !important`,
  },
  "& .MuiFormHelperText-root": { fontSize: "0.75rem", mt: 0.5, ml: 1, fontWeight: 500 },
});

export default function CollectPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const tenantId = user?.tenant_id || 1;

  const state = location.state as {
    student: StudentSearchItem;
    installment: FeeInstallmentStatusInstallment;
    academicYearId?: number;
  } | null;

  const [student, setStudent] = useState<StudentSearchItem | null>(state?.student || null);
  const [installment, setInstallment] = useState<FeeInstallmentStatusInstallment | null>(
    state?.installment || null
  );
  const academicYearId = state?.academicYearId;

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [collectFullBalance, setCollectFullBalance] = useState(false);
  const [collectAmount, setCollectAmount] = useState<number>(installment?.balance || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // If state doesn't have data and we have search params, construct from there
    if (!student && searchParams.get("student_id")) {
      const student_name = searchParams.get("student_name") || "Unknown";
      const student_code = searchParams.get("student_code");
      const roll_no = searchParams.get("roll_no");
      const class_name = searchParams.get("class_name");
      const admission_no = searchParams.get("admission_no");

      setStudent({
        id: Number(searchParams.get("student_id")),
        student_name,
        student_code: student_code || undefined,
        roll_no: roll_no || undefined,
        class_name: class_name || undefined,
        admission_no: admission_no || undefined,
      });
    }

    if (!installment && searchParams.get("fee_installment_id")) {
      setInstallment({
        fee_installment_id: Number(searchParams.get("fee_installment_id")),
        installment: searchParams.get("installment") || "Unknown",
        category: searchParams.get("category") || "Unknown",
        due_date: searchParams.get("due_date") || "",
        amount: Number(searchParams.get("amount") || 0),
        paid: Number(searchParams.get("paid") || 0),
        balance: Number(searchParams.get("balance") || 0),
        status: (searchParams.get("status") as any) || "Pending",
      });
    }
  }, [student, installment, searchParams]);

  useEffect(() => {
    if (!installment) return;
    setCollectFullBalance(false);
    setCollectAmount(installment.balance || 0);
    setErrors({});
  }, [installment?.fee_installment_id]);

  const validateField = (name: string, value: any) => {
    if (name === "collectAmount") {
      const v = Number(value || 0);
      if (!v || v <= 0) return "Required.";
      if (installment && v > installment.balance) return "Cannot exceed current balance.";
      if (installment && installment.balance <= 0) return "No balance to collect.";
      return "";
    }

    if (name === "payment_method") {
      if (!value) return "Required.";
      return "";
    }

    return "";
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const collectAmountErr = validateField("collectAmount", collectAmount);
    if (collectAmountErr) newErrors.collectAmount = collectAmountErr;

    const paymentMethodErr = validateField("payment_method", paymentMethod);
    if (paymentMethodErr) newErrors.payment_method = paymentMethodErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!student || !installment) return;
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await collectFeePayment({
        student_id: student.id,
        tenant_id: academicYearId ? tenantId : (user?.tenant_id || 1), // Use same tenantId logic
        payment_method: paymentMethod,
        reference_no: referenceNo || undefined,
        notes: notes || undefined,
        allocations: [
          {
            fee_installment_id: installment.fee_installment_id,
            amount_allocated: collectAmount,
          },
        ],
      });

      setSuccess(`Payment collected successfully! Payment ID: ${res.payment_id}`);
      setTimeout(() => {
        navigate("/fees/installment-status", {
          state: {
            student,
            classId: student.class_id,
            ...(typeof academicYearId === "number" ? { academicYearId } : {}),
          },
        });
      }, 1500);
    } catch (e: any) {
      setError(e?.message || "Failed to collect payment.");
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  const canCollect =
    Boolean(student && installment) &&
    (installment?.balance ?? 0) > 0 &&
    collectAmount > 0 &&
    collectAmount <= (installment?.balance ?? 0);

  if (!student || !installment) {
    return (
      <ListPageLayout
        pageBackground
        contentPaddingSize="none"
        maxWidth={false}
        contentSx={{ width: "100%", height: "auto", mx: 0, maxWidth: "none" }}
        header={
          <Box sx={{ mb: 0 }}>
            <PageHeader
              links={[
                { title: "Fee Management", path: "/fees" },
                { title: "Collect Payment", path: "#" },
              ]}
              homePath="/"
              actions={
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Tooltip title="Discard Changes">
                    <IconButton
                      onClick={() => navigate("/fees/installment-status")}
                      sx={{
                        color: colorTokens.preschool.coral.main,
                        backgroundColor: alpha(colorTokens.preschool.coral.main, 0.08),
                        borderRadius: "12px",
                        width: 44,
                        height: 44,
                        border: `1.5px solid ${alpha(colorTokens.preschool.coral.main, 0.2)}`,
                        "&:hover": { backgroundColor: alpha(colorTokens.preschool.coral.main, 0.15) },
                      }}
                    >
                      <CancelIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Collect Payment">
                    <IconButton
                      onClick={handleSubmit}
                      disabled={loading || !canCollect}
                      sx={{
                        background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                        color: "white",
                        borderRadius: "12px",
                        width: 44,
                        height: 44,
                        boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.4)}`,
                        },
                        "&.Mui-disabled": { background: "#e2e8f0", color: "#94a3b8" },
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <SaveIcon sx={{ fontSize: 20 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />

            {error && (
              <Alert
                severity="error"
                variant="filled"
                sx={{ mt: 2, borderRadius: "12px" }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" variant="filled" sx={{ mt: 2, borderRadius: "12px" }}>
                {success}
              </Alert>
            )}
          </Box>
        }
      >
        <Box sx={{ p: 3, maxWidth: 700, mx: "auto" }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            No installment data found. Please go back and select an installment to collect payment.
          </Alert>
          <Button
            onClick={() => navigate("/fees/installment-status")}
            variant="contained"
            disabled={loading}
          >
            Back to Installment Status
          </Button>
        </Box>
      </ListPageLayout>
    );
  }

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      maxWidth={false}
      contentSx={{ width: "100%", height: "auto", mx: 0, maxWidth: "none" }}
      header={
        <Box sx={{ mb: 0 }}>
          <PageHeader
            links={[
              { title: "Fee Management", path: "/fees" },
              { title: "Collect Payment", path: "#" },
            ]}
            homePath="/"
            actions={
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Tooltip title="Discard Changes">
                  <IconButton
                    onClick={() => navigate("/fees/installment-status")}
                    sx={{
                      color: colorTokens.preschool.coral.main,
                      backgroundColor: alpha(colorTokens.preschool.coral.main, 0.08),
                      borderRadius: "12px",
                      width: 44,
                      height: 44,
                      border: `1.5px solid ${alpha(colorTokens.preschool.coral.main, 0.2)}`,
                      "&:hover": { backgroundColor: alpha(colorTokens.preschool.coral.main, 0.15) },
                    }}
                  >
                    <CancelIcon sx={{ fontSize: 22 }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Collect Payment">
                  <IconButton
                    onClick={handleSubmit}
                    disabled={loading || !canCollect}
                    sx={{
                      background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                      color: "white",
                      borderRadius: "12px",
                      width: 44,
                      height: 44,
                      boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.4)}`,
                      },
                      "&.Mui-disabled": { background: "#e2e8f0", color: "#94a3b8" },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SaveIcon sx={{ fontSize: 20 }} />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            }
          />

          {error && (
            <Alert
              severity="error"
              variant="filled"
              sx={{ mt: 2, borderRadius: "12px" }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" variant="filled" sx={{ mt: 2, borderRadius: "12px" }}>
              {success}
            </Alert>
          )}
        </Box>
      }
    >
      <Box
        sx={{
          py: 1.5,
          px: 3,
          background: `linear-gradient(90deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.85rem",
            color: "white",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Collect Payment Preview
        </Typography>
        <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
          <Box component="span" sx={{ color: colorTokens.preschool.coral.main, mr: 0.5 }}>
            *
          </Box>{" "}
          Mandatory Fields
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              p: { xs: 2, md: 4 },
              borderRight: { md: `1px solid ${colorTokens.border.subtle}` },
            }}
          >
            <TextField
              label="Amount to Collect"
              required
              fullWidth
              name="collectAmount"
              type="number"
              value={collectAmount}
              onChange={(e) => {
                const v = Number(e.target.value);
                setCollectAmount(v);
                setErrors((prev) => ({ ...prev, collectAmount: validateField("collectAmount", v) }));
              }}
              error={Boolean(errors.collectAmount)}
              helperText={errors.collectAmount || `Maximum balance: ${money(installment.balance)}`}
              placeholder="Enter amount"
              sx={buildFieldSx(Boolean(errors.collectAmount))}
              inputProps={{ min: 0, step: 1, max: installment.balance }}
              disabled={loading || collectFullBalance}
            />

            <Select
              label="Payment Method"
              required
              fullWidth
              value={paymentMethod}
              onChange={(e) => {
                const v = String(e.target.value);
                setPaymentMethod(v);
                setErrors((prev) => ({ ...prev, payment_method: validateField("payment_method", v) }));
              }}
              error={Boolean(errors.payment_method)}
              helperText={errors.payment_method}
              sx={buildFieldSx(Boolean(errors.payment_method))}
              disabled={loading}
            >
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="UPI">UPI</MenuItem>
              <MenuItem value="CARD">Card</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
            </Select>

            <TextField
              label="Reference No (optional)"
              fullWidth
              name="referenceNo"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g., Check No, Transaction ID"
              disabled={loading}
              sx={buildFieldSx(false)}
            />

            <TextField
              label="Notes (optional)"
              fullWidth
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this payment"
              multiline
              minRows={3}
              disabled={loading}
              sx={buildFieldSx(false)}
            />
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: { xs: 2, md: 4 } }}>
            <Box
              sx={{
                p: 3,
                borderRadius: "16px",
                border: `2px dashed ${colorTokens.border.subtle}`,
                bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.02),
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: colorTokens.preschool.turquoise.dark }}>
                PAYMENT PREVIEW
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Student Name</Typography>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{student.student_name || "-"}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Student Code</Typography>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{student.student_code || "-"}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Class</Typography>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{student.class_name || "N/A"}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Roll No</Typography>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{student.roll_no || "-"}</Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Installment</Typography>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{installment.installment || "-"}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Category</Typography>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{installment.category || "-"}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Due Date</Typography>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>
                    {new Date(installment.due_date).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Balance</Typography>
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: installment.balance > 0 ? colorTokens.preschool.coral.main : colorTokens.preschool.mint.main,
                    }}
                  >
                    {money(installment.balance)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
                borderRadius: "12px",
                bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.04),
                border: `1.5px solid ${alpha(colorTokens.preschool.turquoise.main, 0.1)}`,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor:
                      collectAmount >= installment.balance && installment.balance > 0
                        ? colorTokens.preschool.mint.main
                        : colorTokens.preschool.coral.main,
                    boxShadow: `0 0 8px ${
                      collectAmount >= installment.balance && installment.balance > 0
                        ? colorTokens.preschool.mint.main
                        : colorTokens.preschool.coral.main
                    }`,
                  }}
                />
                <Box>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: colorTokens.preschool.turquoise.dark }}>
                    Allocation Mode
                  </Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: colorTokens.text.secondary }}>
                    {installment.balance <= 0
                      ? "No balance to collect"
                      : collectFullBalance
                        ? "Collect Full Balance"
                        : "Custom Amount"}
                    {installment.balance > 0 && (
                      <Box component="span" sx={{ display: "block" }}>
                        Remaining: {money(Math.max(0, installment.balance - collectAmount))}
                      </Box>
                    )}
                  </Typography>
                </Box>
              </Box>

              <Switch
                checked={collectFullBalance}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setCollectFullBalance(checked);
                  if (checked) {
                    const v = installment.balance || 0;
                    setCollectAmount(v);
                    setErrors((prev) => ({ ...prev, collectAmount: validateField("collectAmount", v) }));
                    return;
                  }
                  setErrors((prev) => ({ ...prev, collectAmount: validateField("collectAmount", collectAmount) }));
                }}
                name="collectFullBalance"
                disabled={loading || installment.balance <= 0}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: colorTokens.preschool.mint.main },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: colorTokens.preschool.mint.main },
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          p: 2.5,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          bgcolor: alpha(colorTokens.background.default, 0.5),
          borderTop: `1px solid ${colorTokens.border.subtle}`,
          flexShrink: 0,
        }}
      >
        <Button
          variant="text"
          onClick={() => navigate("/fees/installment-status")}
          sx={{
            color: colorTokens.preschool.coral.main,
            fontWeight: 700,
            px: 4,
            "&:hover": { bgcolor: alpha(colorTokens.preschool.coral.main, 0.05) },
          }}
        >
          Discard
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !canCollect}
          sx={{
            background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
            color: "white",
            fontWeight: 800,
            px: 5,
            borderRadius: "10px",
            boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.2)}`,
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
            },
          }}
        >
          {loading ? "Processing…" : "Collect Payment"}
        </Button>
      </Box>
    </ListPageLayout>
  );
        /* {success && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            sx={{ mb: 3, borderRadius: 2 }}
          >
            Payment collected successfully! Redirecting...
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            bgcolor: "#ffffff",
            border: `1px solid ${colorTokens.border.subtle}`,
            borderRadius: 2,
            p: 3,
            mb: 3,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
            Student Information
          </Typography>
          <Stack spacing={1.5}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: colorTokens.text.secondary, fontWeight: 700 }}>
                  Student Name
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {student.student_name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: colorTokens.text.secondary, fontWeight: 700 }}>
                  Class
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {student.class_name || "N/A"}
                </Typography>
              </Box>
            </Box>
            {student.student_code && (
              <Box>
                <Typography variant="caption" sx={{ color: colorTokens.text.secondary, fontWeight: 700 }}>
                  Student Code
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {student.student_code}
                </Typography>
              </Box>
            )}
            {student.roll_no && (
              <Box>
                <Typography variant="caption" sx={{ color: colorTokens.text.secondary, fontWeight: 700 }}>
                  Roll No
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {student.roll_no}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        <Box
          sx={{
            bgcolor: "#ffffff",
            border: `1px solid ${colorTokens.border.subtle}`,
            borderRadius: 2,
            p: 3,
            mb: 3,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
            Installment Details
          </Typography>
          <Stack spacing={1.5}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: colorTokens.text.secondary, fontWeight: 700 }}>
                  Installment
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {installment.installment}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: colorTokens.text.secondary, fontWeight: 700 }}>
                  Category
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {installment.category}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: colorTokens.text.secondary, fontWeight: 700 }}>
                  Due Date
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {new Date(installment.due_date).toLocaleDateString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: colorTokens.text.secondary, fontWeight: 700 }}>
                  Amount
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {money(installment.amount)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: colorTokens.text.secondary, fontWeight: 700 }}>
                  Balance
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: installment.balance > 0 ? colorTokens.preschool.coral.main : colorTokens.preschool.mint.main,
                  }}
                >
                  {money(installment.balance)}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            bgcolor: "#ffffff",
            border: `1px solid ${colorTokens.border.subtle}`,
            borderRadius: 2,
            p: 3,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>
            Payment Details
          </Typography>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Amount to Collect"
              type="number"
              value={collectAmount}
              onChange={(e) => setCollectAmount(Number(e.target.value))}
              inputProps={{ min: 0, step: 1, max: installment.balance }}
              helperText={`Maximum balance: ${money(installment.balance)}`}
              disabled={loading}
            />

            <FormControl fullWidth disabled={loading}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                Payment Method
              </Typography>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(String(e.target.value))}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="CARD">Card</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Reference No (optional)"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g., Check No, Transaction ID, etc."
              disabled={loading}
            />

            <TextField
              fullWidth
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this payment"
              multiline
              minRows={3}
              disabled={loading}
            />

            <Box sx={{ display: "flex", gap: 2, pt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/fees/installment-status")}
                disabled={loading}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !student ||
                  !installment ||
                  !(collectAmount > 0) ||
                  collectAmount > installment.balance
                }
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 900,
                  background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                }}
              >
                {loading ? "Processing..." : "Collect Payment"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>
    </ListPageLayout>
  );
        */
}
