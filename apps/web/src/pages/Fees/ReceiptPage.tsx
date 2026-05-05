import { alpha } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  CircularProgress,
  GlobalStyles,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { PageHeader } from "../../components/layout";
import { HeaderIconAction, ListPageLayout } from "../../components/reusable";
import { useAuth } from "../../context/AuthContext";
import { colorTokens } from "../../tokens/colors";
import {
  getFeeReceiptDetail,
  getInvoiceReceiptDetail,
} from "../../api/services/feeCollectionService";
import type { FeeReceiptDetailResponse, FeeReceiptFeeDetailItem } from "../../types/feeCollection";

function tenantAddressLines(tenant: {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
} | null | undefined): string[] {
  if (!tenant) return [];
  const lines: string[] = [];
  if (tenant.address_line1?.trim()) lines.push(tenant.address_line1.trim());
  if (tenant.address_line2?.trim()) lines.push(tenant.address_line2.trim());
  const cityState = [tenant.city, tenant.state].filter((x) => x?.trim()).join(", ");
  const pin = tenant.pin_code?.trim();
  const last = [cityState, pin].filter(Boolean).join(" ");
  if (last) lines.push(last);
  return lines;
}

export default function ReceiptPage() {
  const { paymentId, invoiceId } = useParams<{ paymentId?: string; invoiceId?: string }>();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<FeeReceiptDetailResponse | null>(null);

  const numericPaymentId = Number(paymentId);
  const numericInvoiceId = Number(invoiceId);
  const invoiceIdFromState = Number((location.state as { invoice_id?: number } | null)?.invoice_id);
  const resolvedInvoiceId =
    Number.isFinite(numericInvoiceId) && numericInvoiceId > 0 ? numericInvoiceId : invoiceIdFromState;
  const isInvoiceScope = Number.isFinite(numericInvoiceId) && numericInvoiceId > 0;

  useEffect(() => {
    let mounted = true;
    const loadReceipt = async () => {
      const hasValidPaymentId = Number.isFinite(numericPaymentId) && numericPaymentId > 0;
      const hasValidInvoiceId = Number.isFinite(numericInvoiceId) && numericInvoiceId > 0;
      if (!hasValidPaymentId && !hasValidInvoiceId) {
        setError("Receipt not found");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = hasValidInvoiceId
          ? await getInvoiceReceiptDetail(numericInvoiceId)
          : await getFeeReceiptDetail(numericPaymentId);
        if (!mounted) return;
        setReceipt(data);
      } catch (err: any) {
        if (!mounted) return;
        setReceipt(null);
        const message = String(err?.message || "");
        if (/not found/i.test(message)) {
          setError("Receipt not found");
        } else if (/forbidden|authorized|permission/i.test(message)) {
          setError("You are not authorized to view this receipt");
        } else if (/network/i.test(message)) {
          setError("Check your internet connection");
        } else {
          setError("Unable to load receipt");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadReceipt();
    return () => {
      mounted = false;
    };
  }, [numericPaymentId, numericInvoiceId]);

  const generatedAt = useMemo(() => {
    if (!receipt?.payment_date) return "-";
    const parsed = new Date(receipt.payment_date);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [receipt?.payment_date]);

  const organizationAddress = useMemo(() => tenantAddressLines(user?.tenant ?? undefined), [user?.tenant]);
  const displayClass = [receipt?.class_name, receipt?.division_name].filter(Boolean).join(" - ") || "N/A";
  const paymentDate = useMemo(() => {
    if (!receipt?.payment_date) return "N/A";
    const parsed = new Date(receipt.payment_date);
    return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleDateString("en-GB");
  }, [receipt?.payment_date]);
  const tenantLogo = user?.tenant?.logo_url || null;
  const printableTitle = isInvoiceScope ? "Payment Receipt (Full)" : "Payment Receipt";

  const onPrint = useCallback(() => {
    try {
      window.print();
    } catch {
      setError("Unable to generate print view");
    }
  }, []);

  const onDownloadPdf = useCallback(() => {
    try {
      setNotice("Use your browser destination as Save to PDF");
      window.print();
      setNotice("Receipt downloaded successfully");
    } catch {
      setError("Failed to download receipt");
    }
  }, []);

  const onShare = useCallback(async () => {
    if (!receipt) return;
    const title = `Receipt ${receipt.receipt_number || ""}`.trim();
    const text = `Payment receipt for ${receipt.student_name}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }
      await navigator.clipboard.writeText(`${title}\n${text}`);
      setNotice("Receipt details copied for sharing");
    } catch {
      setError("Unable to share receipt");
    }
  }, [receipt]);

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[
            { title: "Invoice List", path: "/fees/invoices" },
            { title: printableTitle, path: "#" },
          ]}
          homePath="/"
          actions={
            <Box className="receipt-no-print" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <HeaderIconAction
                tooltip="Print"
                icon={<PrintRoundedIcon fontSize="small" />}
                onClick={onPrint}
                aria-label="Print receipt"
              />
              <HeaderIconAction
                tooltip="Download PDF"
                icon={<DownloadRoundedIcon fontSize="small" />}
                onClick={onDownloadPdf}
                aria-label="Download receipt PDF"
              />
              <HeaderIconAction
                tooltip="Share"
                icon={<IosShareRoundedIcon fontSize="small" />}
                onClick={onShare}
                aria-label="Share receipt"
              />
            </Box>
          }
        />
      }
    >
      <GlobalStyles
        styles={{
          "@media print": {
            "body *": { visibility: "hidden" },
            ".receipt-print-area, .receipt-print-area *": { visibility: "visible" },
            ".receipt-print-area": {
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              padding: 0,
              margin: 0,
            },
            ".receipt-no-print": { display: "none !important" },
          },
        }}
      />
      <Box sx={{ p: 2 }}>
        {notice && (
          <Alert severity="success" sx={{ mb: 1.5 }} className="receipt-no-print">
            {notice}
          </Alert>
        )}

        <Paper
          className="receipt-print-area"
          sx={{
            bgcolor: colorTokens.surface.card,
            color: colorTokens.text.primary,
            borderRadius: 0.5,
            p: { xs: 1.25, md: 2 },
            border: `1px solid ${colorTokens.border.strong}`,
          }}
        >
          {loading ? (
            <Box sx={{ py: 8, display: "grid", placeItems: "center" }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : receipt ? (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Regd. No.: {receipt.admission_no || "N/A"}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center", flex: 1, px: 1 }}>
                  {!!tenantLogo && (
                    <Box sx={{ mb: 0.5 }}>
                      <Box
                        component="img"
                        src={tenantLogo}
                        alt="Tenant logo"
                        sx={{ width: 64, height: 64, objectFit: "contain", mx: "auto" }}
                      />
                    </Box>
                  )}
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {user?.tenant?.name || "School"}
                  </Typography>
                  {organizationAddress.length > 0 ? (
                    organizationAddress.map((line) => (
                      <Typography key={line} variant="body2">
                        {line}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2">Pune, Pune - 411057</Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Receipt Type: {isInvoiceScope ? "Full / Combined" : "Payment"}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Invoice: {receipt.invoice_no || "N/A"}</Typography>
                </Box>
              </Stack>

              <Box
                sx={{
                  border: `1px solid ${colorTokens.border.default}`,
                  p: 1.5,
                  mb: 1.5,
                  bgcolor: alpha(colorTokens.preschool.turquoise.light, 0.08),
                }}
              >
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontStyle: "italic" }}>
                    Receipt Number :
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {receipt.receipt_number || "N/A"}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontStyle: "italic" }}>
                    Academic Year :
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {receipt.academic_year || "N/A"}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontStyle: "italic" }}>
                    Date :
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {paymentDate}
                  </Typography>
                </Stack>

                <Stack spacing={0.75}>
                  <Stack direction="row" spacing={2}>
                    <Typography sx={{ minWidth: 160, fontStyle: "italic" }}>Master / Miss</Typography>
                    <Typography sx={{ flex: 1, borderBottom: `2px dotted ${colorTokens.border.strong}` }}>
                      {receipt.student_name}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Typography sx={{ minWidth: 160, fontStyle: "italic" }}>Class</Typography>
                    <Typography sx={{ flex: 1, borderBottom: `2px dotted ${colorTokens.border.strong}` }}>
                      {displayClass}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Typography sx={{ minWidth: 160, fontStyle: "italic" }}>Sum of Rs. (In Words)</Typography>
                    <Typography sx={{ flex: 1, borderBottom: `2px dotted ${colorTokens.border.strong}` }}>
                      {receipt.amount_in_words}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Typography sx={{ minWidth: 160, fontStyle: "italic" }}>Paid For</Typography>
                    <Typography sx={{ flex: 1, borderBottom: `2px dotted ${colorTokens.border.strong}` }}>
                      {receipt.paid_for || receipt.installment || "Fee installment"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Typography sx={{ minWidth: 160, fontStyle: "italic" }}>Amount (Rs.)</Typography>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          px: 1.5,
                          border: `2px solid ${colorTokens.gray[700]}`,
                          fontWeight: 800,
                          display: "inline-flex",
                        }}
                      >
                        {Number(receipt.total_amount || 0).toLocaleString("en-IN")} /-
                      </Typography>
                      <Typography sx={{ borderBottom: `2px dotted ${colorTokens.border.strong}`, flex: 1 }}>
                        By {receipt.payment_method || "N/A"}
                      </Typography>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Typography sx={{ minWidth: 160, fontStyle: "italic" }}>Remarks</Typography>
                    <Typography sx={{ flex: 1, borderBottom: `2px dotted ${colorTokens.border.strong}` }}>
                      {receipt.notes || "Amount paid for fee invoice"}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>

              {/* ── Fee Details ─────────────────────────────────────────── */}
              {receipt.fee_details.length > 0 && (
                <>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      textAlign: "center",
                      fontWeight: 800,
                      mb: 0.75,
                      mt: 1.5,
                      color: colorTokens.preschool.turquoise.dark,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontSize: "0.78rem",
                    }}
                  >
                    Fee Details
                  </Typography>
                  <Table
                    size="small"
                    sx={{
                      mb: 2,
                      border: `1px solid ${colorTokens.border.default}`,
                    }}
                  >
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.12) }}>
                        {["No.", "Fee Type", "Installment", "Amount (Rs.)", "Amount Paid (Rs.)"].map((h) => (
                          <TableCell
                            key={h}
                            sx={{
                              fontWeight: 800,
                              border: `1px solid ${colorTokens.border.strong}`,
                              textAlign: h === "No." ? "center" : h.startsWith("Amount") ? "right" : "left",
                              fontSize: "0.78rem",
                              color: colorTokens.text.primary,
                            }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {receipt.fee_details.map((item: FeeReceiptFeeDetailItem) => (
                        <TableRow key={item.sr_no} sx={{ "&:nth-of-type(even)": { bgcolor: alpha(colorTokens.background.subtle, 0.4) } }}>
                          <TableCell sx={{ border: `1px solid ${colorTokens.border.default}`, textAlign: "center" }}>
                            {item.sr_no}
                          </TableCell>
                          <TableCell sx={{ border: `1px solid ${colorTokens.border.default}` }}>
                            {item.fee_category_name || "Fee"}
                          </TableCell>
                          <TableCell sx={{ border: `1px solid ${colorTokens.border.default}` }}>
                            {item.payable_for || receipt.installment || "—"}
                          </TableCell>
                          <TableCell sx={{ border: `1px solid ${colorTokens.border.default}`, textAlign: "right" }}>
                            {Number(item.amount || 0).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell sx={{ border: `1px solid ${colorTokens.border.default}`, textAlign: "right", fontWeight: 700, color: colorTokens.preschool.mint.dark }}>
                            {Number(item.paid_amount || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.06) }}>
                        <TableCell
                          colSpan={4}
                          sx={{ border: `1px solid ${colorTokens.border.strong}`, textAlign: "right", fontWeight: 800 }}
                        >
                          Total Paid
                        </TableCell>
                        <TableCell
                          sx={{ border: `1px solid ${colorTokens.border.strong}`, textAlign: "right", fontWeight: 900, color: colorTokens.preschool.mint.dark }}
                        >
                          {Number(receipt.total_amount || 0).toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              )}

              {/* ── Payment Details ──────────────────────────────────────── */}
              <Typography
                variant="subtitle1"
                sx={{
                  textAlign: "center",
                  fontWeight: 800,
                  mb: 0.75,
                  color: colorTokens.preschool.coral.dark,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontSize: "0.78rem",
                }}
              >
                Payment Details
              </Typography>
              <Table
                size="small"
                sx={{
                  border: `1px solid ${colorTokens.border.default}`,
                }}
              >
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(colorTokens.preschool.coral.main, 0.1) }}>
                    {["No.", "Txn Number", "Type", "Bank Name", "Amount (Rs.)"].map((h) => (
                      <TableCell
                        key={h}
                        sx={{
                          fontWeight: 800,
                          border: `1px solid ${colorTokens.border.strong}`,
                          textAlign: h === "No." || h === "Amount (Rs.)" ? "center" : "left",
                          fontSize: "0.78rem",
                          color: colorTokens.text.primary,
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipt.payment_lines.map((line) => (
                    <TableRow key={`${line.sr_no}-${line.amount}`}>
                      <TableCell sx={{ border: `1px solid ${colorTokens.border.default}`, textAlign: "center" }}>{line.sr_no}</TableCell>
                      <TableCell sx={{ border: `1px solid ${colorTokens.border.default}` }}>
                        {line.txn_number || receipt.transaction_number || "N/A"}
                      </TableCell>
                      <TableCell sx={{ border: `1px solid ${colorTokens.border.default}` }}>{line.payment_type || "N/A"}</TableCell>
                      <TableCell sx={{ border: `1px solid ${colorTokens.border.default}` }}>{line.bank_name || "—"}</TableCell>
                      <TableCell sx={{ border: `1px solid ${colorTokens.border.default}`, textAlign: "right", fontWeight: 700 }}>
                        {Number(line.amount || 0).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: alpha(colorTokens.preschool.coral.main, 0.06) }}>
                    <TableCell
                      colSpan={4}
                      sx={{ border: `1px solid ${colorTokens.border.strong}`, textAlign: "right", fontWeight: 800 }}
                    >
                      Total Paid
                    </TableCell>
                    <TableCell
                      sx={{ border: `1px solid ${colorTokens.border.strong}`, textAlign: "right", fontWeight: 900 }}
                    >
                      {Number(receipt.total_amount || 0).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Accounts Officer
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  * Non Refundable
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Sr. Clerk/Clerk
                </Typography>
              </Stack>

              <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                Creator: {receipt.created_by_name || "N/A"} | Generated: {generatedAt}
              </Typography>
            </Box>
          ) : null}
        </Paper>
      </Box>
    </ListPageLayout>
  );
}
