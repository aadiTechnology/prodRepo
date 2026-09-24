import { alpha } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useSnackbar } from "notistack";
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
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import PrintIcon from "@mui/icons-material/Print";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import { PageHeader } from "../../components/layout";
import { HeaderIconAction, ListPageLayout } from "../../components/reusable";
import { useAuth } from "../../context/AuthContext";
import { colorTokens } from "../../tokens/colors";
import { radiusTokens } from "../../tokens/radius";
import { elevationSemantic } from "../../tokens/elevation";
import { typographyTokens } from "../../tokens/typography";
import {
  getFeeReceiptDetail,
  getInvoiceReceiptDetail,
} from "../../api/services/feeCollectionService";
import type { FeeReceiptDetailResponse, FeeReceiptFeeDetailItem } from "../../types/feeCollection";
import {
  FEE_DETAILS_PAGE_LABEL,
  FEE_LIST_MENU_LABEL,
  FEE_LIST_MENU_PATH,
} from "../../utils/menuNavigation";

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

function SectionIcon({
  icon,
  color = colorTokens.preschool.turquoise.main,
  bg,
}: {
  icon: ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        bgcolor: bg ?? alpha(color, 0.14),
        color,
      }}
    >
      {icon}
    </Box>
  );
}

function DetailRow({ label, value, valueSx }: { label: string; value: ReactNode; valueSx?: object }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ py: 0.55 }}>
      <Typography
        sx={{
          minWidth: { xs: 118, sm: 148 },
          color: colorTokens.text.secondary,
          fontSize: typographyTokens.fontSize.sm,
          fontWeight: typographyTokens.fontWeight.medium,
          pt: 0.15,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          color: colorTokens.gray[500],
          fontSize: typographyTokens.fontSize.sm,
          pt: 0.15,
        }}
      >
        :
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0, ...valueSx }}>{value}</Box>
    </Stack>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{
        px: 1.75,
        py: 1.35,
        borderRadius: `${radiusTokens.xl}px`,
        bgcolor: alpha(colorTokens.preschool.turquoise.light, 0.12),
        border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.16)}`,
      }}
    >
      <SectionIcon icon={icon} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: typographyTokens.fontSize.xs,
            color: colorTokens.text.secondary,
            fontWeight: typographyTokens.fontWeight.medium,
            letterSpacing: typographyTokens.letterSpacing.wide,
            textTransform: "uppercase",
            mb: 0.15,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontWeight: typographyTokens.fontWeight.bold,
            color: colorTokens.gray[800],
            fontSize: typographyTokens.fontSize.base,
            lineHeight: typographyTokens.lineHeight.snug,
            wordBreak: "break-word",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function ReceiptPage() {
  const { paymentId, invoiceId } = useParams<{ paymentId?: string; invoiceId?: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<FeeReceiptDetailResponse | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);

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
  const schoolName = user?.tenant?.name || "School";
  const printableTitle = isInvoiceScope ? "Payment Receipt (Full)" : "Fee Receipt";
  const receiptActionButtonSx = {
    background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
    color: colorTokens.primary.contrast,
    borderRadius: "15px",
    width: 44,
    height: 44,
    boxShadow: `0 8px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.25)}`,
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "scale(1.08)",
      boxShadow: `0 12px 20px ${alpha(colorTokens.preschool.turquoise.main, 0.35)}`,
    },
  };

  const tableBorder = `1px solid ${colorTokens.border.default}`;
  const tableHeadBorder = `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.22)}`;

  const clearSelectionForPrint = useCallback(() => {
    try {
      const selection = window.getSelection?.();
      if (selection && selection.rangeCount > 0) {
        selection.removeAllRanges();
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    } catch {
      // Ignore selection-clear errors and continue with print.
    }
  }, []);

  const waitForReceiptImages = useCallback(async (container: HTMLElement) => {
    const images = Array.from(container.querySelectorAll("img"));
    if (images.length === 0) return;

    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }

            const cleanup = () => {
              img.removeEventListener("load", onDone);
              img.removeEventListener("error", onDone);
            };
            const onDone = () => {
              cleanup();
              resolve();
            };

            img.addEventListener("load", onDone, { once: true });
            img.addEventListener("error", onDone, { once: true });
            window.setTimeout(onDone, 3000);
          })
      )
    );
  }, []);

  const onPrint = useCallback(() => {
    try {
      clearSelectionForPrint();
      const originalTitle = document.title;
      const printableName = receipt?.receipt_number
        ? `Receipt-${receipt.receipt_number}`
        : "Receipt";
      document.title = printableName;
      const restoreTitle = () => {
        document.title = originalTitle;
        window.removeEventListener("afterprint", restoreTitle);
      };
      window.addEventListener("afterprint", restoreTitle);
      window.print();
    } catch {
      setError("Unable to generate print view");
    }
  }, [clearSelectionForPrint, receipt?.receipt_number]);

  const onDownloadPdf = useCallback(async () => {
    try {
      clearSelectionForPrint();
      setError(null);
      const printNode = receiptRef.current;
      if (!printNode) {
        setError("Failed to download receipt");
        return;
      }
      await waitForReceiptImages(printNode);
      const canvas = await html2canvas(printNode, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableWidth = pageWidth - margin * 2;
      const scaledHeight = (canvas.height * usableWidth) / canvas.width;

      if (scaledHeight <= pageHeight - margin * 2) {
        pdf.addImage(imageData, "PNG", margin, margin, usableWidth, scaledHeight, undefined, "FAST");
      } else {
        const usableHeight = pageHeight - margin * 2;
        const pageCanvas = document.createElement("canvas");
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) {
          setError("Failed to download receipt");
          return;
        }
        const pagePixelHeight = Math.floor((usableHeight * canvas.width) / usableWidth);
        pageCanvas.width = canvas.width;
        pageCanvas.height = pagePixelHeight;

        let renderedHeight = 0;
        let pageIndex = 0;
        while (renderedHeight < canvas.height) {
          ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            renderedHeight,
            canvas.width,
            Math.min(pagePixelHeight, canvas.height - renderedHeight),
            0,
            0,
            canvas.width,
            Math.min(pagePixelHeight, canvas.height - renderedHeight)
          );
          const pageData = pageCanvas.toDataURL("image/png");
          if (pageIndex > 0) pdf.addPage();
          const currentSliceHeight = Math.min(pagePixelHeight, canvas.height - renderedHeight);
          const renderedMm = (currentSliceHeight * usableWidth) / canvas.width;
          pdf.addImage(pageData, "PNG", margin, margin, usableWidth, renderedMm, undefined, "FAST");
          renderedHeight += pagePixelHeight;
          pageIndex += 1;
        }
      }

      const fileName = `${receipt?.receipt_number || "receipt"}.pdf`;
      pdf.save(fileName);
      enqueueSnackbar("Receipt downloaded successfully", { variant: "success" });
    } catch {
      setError("Failed to download receipt");
      enqueueSnackbar("Failed to download receipt", { variant: "error" });
    }
  }, [clearSelectionForPrint, receipt?.receipt_number, enqueueSnackbar, waitForReceiptImages]);

  const onShare = useCallback(async () => {
    if (!receipt) return;
    const title = `Receipt ${receipt.receipt_number || ""}`.trim();
    const text = `Payment receipt for ${receipt.student_name}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        enqueueSnackbar("Receipt shared successfully", { variant: "success" });
        return;
      }
      await navigator.clipboard.writeText(`${title}\n${text}`);
      enqueueSnackbar("Receipt details copied for sharing", { variant: "success" });
    } catch {
      setError("Unable to share receipt");
      enqueueSnackbar("Unable to share receipt", { variant: "error" });
    }
  }, [receipt, enqueueSnackbar]);

  return (
    <ListPageLayout
      data-testid="page-receipt-details"
      header={
        <PageHeader
          links={
            Number.isFinite(resolvedInvoiceId) && resolvedInvoiceId > 0
              ? [
                  { title: FEE_LIST_MENU_LABEL, path: FEE_LIST_MENU_PATH },
                  { title: FEE_DETAILS_PAGE_LABEL, path: `/fees/invoices/${resolvedInvoiceId}/detail` },
                  { title: "Payment Receipt", path: "#" },
                ]
              : [
                  { title: FEE_LIST_MENU_LABEL, path: FEE_LIST_MENU_PATH },
                  { title: printableTitle, path: "#" },
                ]
          }
          homePath="/"
          actions={
            <Box className="receipt-no-print" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <HeaderIconAction
                tooltip="Print"
                icon={<PrintIcon sx={{ fontSize: 20 }} />}
                onClick={onPrint}
                aria-label="Print receipt"
                data-testid="btn-print"
                sx={receiptActionButtonSx}
              />
              <HeaderIconAction
                tooltip="Download PDF"
                icon={<DownloadIcon sx={{ fontSize: 20 }} />}
                onClick={onDownloadPdf}
                aria-label="Download receipt PDF"
                data-testid="btn-export"
                sx={receiptActionButtonSx}
              />
              <HeaderIconAction
                tooltip="Share"
                icon={<ShareIcon sx={{ fontSize: 20 }} />}
                onClick={onShare}
                aria-label="Share receipt"
                data-testid="btn-share"
                sx={receiptActionButtonSx}
              />
            </Box>
          }
        />
      }
    >
      <GlobalStyles
        styles={{
          "@media print": {
            "@page": {
              size: "A4",
              margin: "8mm",
            },
            html: {
              background: `${colorTokens.surface.card} !important`,
            },
            body: {
              background: `${colorTokens.surface.card} !important`,
              margin: "0 !important",
              padding: "0 !important",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            },
            "body *": { visibility: "hidden" },
            ".receipt-print-area, .receipt-print-area *": {
              visibility: "visible",
              WebkitPrintColorAdjust: "exact !important",
              printColorAdjust: "exact !important",
            },
            ".receipt-print-area": {
              position: "absolute !important",
              left: "0 !important",
              top: "0 !important",
              right: "0 !important",
              width: "100% !important",
              maxWidth: "none !important",
              margin: "0 !important",
              padding: "28px !important",
              boxShadow: "none !important",
              borderRadius: `${radiusTokens["2xl"]}px !important`,
              border: `1px solid ${colorTokens.border.default} !important`,
              backgroundColor: `${colorTokens.surface.card} !important`,
              overflow: "visible !important",
            },
            ".receipt-print-area *": {
              boxShadow: "none !important",
            },
            /* Lock desktop layout — print page width is below MUI md breakpoint */
            ".receipt-print-header": {
              flexDirection: "row !important",
              alignItems: "flex-start !important",
            },
            ".receipt-print-title": {
              textAlign: "center !important",
              alignSelf: "center !important",
            },
            ".receipt-print-title > .MuiTypography-root:first-of-type": {
              fontSize: `${typographyTokens.fontSize["3xl"]}px !important`,
            },
            ".receipt-print-title-row": {
              justifyContent: "center !important",
            },
            ".receipt-print-admit-wrap": {
              justifyContent: "flex-end !important",
            },
            ".receipt-print-student-meta": {
              display: "grid !important",
              gridTemplateColumns: "1.45fr 1fr !important",
            },
            ".receipt-print-footer": {
              display: "grid !important",
              gridTemplateColumns: "1.2fr 1fr 1fr !important",
            },
            ".receipt-print-thanks": {
              textAlign: "right !important",
            },
            ".receipt-no-print": { display: "none !important" },
          },
        }}
      />
      <Box sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: colorTokens.background.default }}>
        <Paper
          ref={receiptRef}
          component="div"
          className="receipt-print-area"
          elevation={0}
          sx={{
            bgcolor: colorTokens.surface.card,
            color: colorTokens.text.primary,
            borderRadius: `${radiusTokens["2xl"]}px`,
            p: { xs: 2, sm: 2.5, md: 3.5 },
            border: `1px solid ${colorTokens.border.default}`,
            boxShadow: elevationSemantic.card,
            width: "100%",
            overflow: "hidden",
            position: "relative",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.preschool.mint.main} 50%, ${colorTokens.preschool.peach.main} 100%)`,
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            },
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
              {/* ── Header ─────────────────────────────────────────── */}
              <Stack
                className="receipt-print-header"
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "flex-start" }}
                spacing={2}
                sx={{ mb: 2.75, pt: 0.5 }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                  {!!tenantLogo && (
                    <Box
                      component="img"
                      src={tenantLogo}
                      alt={`${schoolName} logo`}
                      crossOrigin="anonymous"
                      sx={{
                        width: 64,
                        height: 64,
                        objectFit: "contain",
                        flexShrink: 0,
                        borderRadius: `${radiusTokens.lg}px`,
                      }}
                    />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: typographyTokens.fontWeight.bold,
                        fontSize: { xs: typographyTokens.fontSize.lg, md: typographyTokens.fontSize.xl },
                        color: colorTokens.gray[800],
                        lineHeight: typographyTokens.lineHeight.tight,
                        letterSpacing: typographyTokens.letterSpacing.tight,
                      }}
                    >
                      {schoolName}
                    </Typography>
                    {organizationAddress.length > 0 ? (
                      <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mt: 0.75 }}>
                        <LocationOnOutlinedIcon
                          sx={{ fontSize: 16, color: colorTokens.preschool.turquoise.dark, mt: 0.15 }}
                        />
                        <Box>
                          {organizationAddress.map((line) => (
                            <Typography
                              key={line}
                              sx={{
                                fontSize: typographyTokens.fontSize.sm,
                                color: colorTokens.text.secondary,
                                lineHeight: typographyTokens.lineHeight.snug,
                              }}
                            >
                              {line}
                            </Typography>
                          ))}
                        </Box>
                      </Stack>
                    ) : null}
                  </Box>
                </Stack>

                <Box
                  className="receipt-print-title"
                  sx={{
                    textAlign: { xs: "left", md: "center" },
                    flex: 1,
                    alignSelf: { xs: "stretch", md: "center" },
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: typographyTokens.fontWeight.bold,
                      fontSize: { xs: typographyTokens.fontSize["2xl"], md: typographyTokens.fontSize["3xl"] },
                      color: colorTokens.gray[800],
                      letterSpacing: typographyTokens.letterSpacing.tight,
                      lineHeight: typographyTokens.lineHeight.tight,
                    }}
                  >
                    Fee Receipt
                  </Typography>
                  <Stack
                    className="receipt-print-title-row"
                    direction="row"
                    alignItems="center"
                    justifyContent={{ xs: "flex-start", md: "center" }}
                    spacing={1.25}
                    sx={{ mt: 0.75 }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 1,
                        bgcolor: colorTokens.border.strong,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: typographyTokens.fontSize.sm,
                        color: colorTokens.text.secondary,
                        fontStyle: "italic",
                        letterSpacing: typographyTokens.letterSpacing.wide,
                      }}
                    >
                      Official Payment Confirmation
                    </Typography>
                    <Box
                      sx={{
                        width: 36,
                        height: 1,
                        bgcolor: colorTokens.border.strong,
                      }}
                    />
                  </Stack>
                </Box>

                <Box
                  className="receipt-print-admit-wrap"
                  sx={{
                    flex: 1,
                    display: "flex",
                    justifyContent: { xs: "flex-start", md: "flex-end" },
                    minWidth: 0,
                  }}
                >
                  {receipt.admission_no ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: `${radiusTokens.xl}px`,
                        bgcolor: alpha(colorTokens.preschool.peach.main, 0.12),
                        border: `1px solid ${alpha(colorTokens.preschool.peach.main, 0.28)}`,
                      }}
                    >
                      <SectionIcon
                        icon={<BadgeOutlinedIcon sx={{ fontSize: 18 }} />}
                        color={colorTokens.preschool.peach.dark}
                      />
                      <Box>
                        <Typography
                          sx={{
                            fontSize: typographyTokens.fontSize.xs,
                            color: colorTokens.text.secondary,
                            textTransform: "uppercase",
                            letterSpacing: typographyTokens.letterSpacing.wide,
                            fontWeight: typographyTokens.fontWeight.medium,
                          }}
                        >
                          Admission No.
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: typographyTokens.fontWeight.bold,
                            fontSize: typographyTokens.fontSize.sm,
                            color: colorTokens.gray[800],
                          }}
                        >
                          {receipt.admission_no}
                        </Typography>
                      </Box>
                    </Stack>
                  ) : null}
                </Box>
              </Stack>

              {/* ── Student + Meta ─────────────────────────────────── */}
              <Box
                className="receipt-print-student-meta"
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1.45fr 1fr" },
                  gap: 2,
                  mb: 2.5,
                }}
              >
                <Box
                  sx={{
                    borderRadius: `${radiusTokens.xl}px`,
                    bgcolor: alpha(colorTokens.preschool.turquoise.light, 0.1),
                    border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.18)}`,
                    p: { xs: 1.75, md: 2 },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <SectionIcon icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />} />
                    <Typography
                      sx={{
                        fontWeight: typographyTokens.fontWeight.bold,
                        fontSize: typographyTokens.fontSize.md,
                        color: colorTokens.gray[800],
                      }}
                    >
                      Student Details
                    </Typography>
                  </Stack>

                  <DetailRow
                    label="Master / Miss"
                    value={
                      <Typography sx={{ fontWeight: typographyTokens.fontWeight.semibold, fontSize: typographyTokens.fontSize.base }}>
                        {receipt.student_name}
                      </Typography>
                    }
                  />
                  <DetailRow
                    label="Class"
                    value={
                      <Typography sx={{ fontWeight: typographyTokens.fontWeight.medium, fontSize: typographyTokens.fontSize.base }}>
                        {displayClass}
                      </Typography>
                    }
                  />
                  <DetailRow
                    label="Sum of Rs. (In Words)"
                    value={
                      <Typography sx={{ fontSize: typographyTokens.fontSize.sm, lineHeight: typographyTokens.lineHeight.snug }}>
                        {receipt.amount_in_words}
                      </Typography>
                    }
                  />
                  <DetailRow
                    label="Paid For"
                    value={
                      <Typography sx={{ fontSize: typographyTokens.fontSize.base }}>
                        {receipt.paid_for || receipt.installment || "Fee installment"}
                      </Typography>
                    }
                  />
                  <DetailRow
                    label="Amount (Rs.)"
                    value={
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          px: 1.25,
                          py: 0.35,
                          borderRadius: `${radiusTokens.lg}px`,
                          bgcolor: alpha(colorTokens.preschool.mint.main, 0.16),
                          color: colorTokens.preschool.mint.dark,
                          fontWeight: typographyTokens.fontWeight.bold,
                          fontSize: typographyTokens.fontSize.md,
                          border: `1px solid ${alpha(colorTokens.preschool.mint.main, 0.35)}`,
                        }}
                      >
                        ₹ {Number(receipt.total_amount || 0).toLocaleString("en-IN")} /-
                      </Box>
                    }
                  />
                </Box>

                <Stack spacing={1.25} justifyContent="stretch">
                  <MetaRow
                    icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />}
                    label="Receipt No."
                    value={receipt.receipt_number || "N/A"}
                  />
                  <MetaRow
                    icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 17 }} />}
                    label="Date"
                    value={paymentDate}
                  />
                  <MetaRow
                    icon={<SchoolOutlinedIcon sx={{ fontSize: 18 }} />}
                    label="Academic Year"
                    value={receipt.academic_year || "N/A"}
                  />
                </Stack>
              </Box>

              {/* ── Fee Details ────────────────────────────────────── */}
              {receipt.fee_details.length > 0 && (
                <Box sx={{ mb: 2.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                    <SectionIcon icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 18 }} />} />
                    <Typography
                      sx={{
                        fontWeight: typographyTokens.fontWeight.bold,
                        fontSize: typographyTokens.fontSize.md,
                        color: colorTokens.gray[800],
                      }}
                    >
                      Fee Details
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      borderRadius: `${radiusTokens.xl}px`,
                      border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.2)}`,
                      overflow: "hidden",
                    }}
                  >
                    <Table size="small" data-testid="grid-receipt-fee-details">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.12) }}>
                          {["No.", "Fee Type", "Installment", "Amount (Rs.)", "Amount Paid (Rs.)"].map((h) => (
                            <TableCell
                              key={h}
                              sx={{
                                fontWeight: typographyTokens.fontWeight.bold,
                                borderBottom: tableHeadBorder,
                                textAlign: h === "No." ? "center" : h.startsWith("Amount") ? "right" : "left",
                                fontSize: typographyTokens.fontSize.sm,
                                color: colorTokens.gray[800],
                                py: 1.15,
                              }}
                            >
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {receipt.fee_details.map((item: FeeReceiptFeeDetailItem) => (
                          <TableRow
                            key={item.sr_no}
                            sx={{
                              "&:nth-of-type(even)": { bgcolor: alpha(colorTokens.background.subtle, 0.55) },
                            }}
                          >
                            <TableCell sx={{ borderBottom: tableBorder, textAlign: "center", py: 1 }}>
                              {item.sr_no}
                            </TableCell>
                            <TableCell sx={{ borderBottom: tableBorder, py: 1 }}>
                              {item.fee_category_name || "Fee"}
                            </TableCell>
                            <TableCell sx={{ borderBottom: tableBorder, py: 1 }}>
                              {item.payable_for || receipt.installment || "—"}
                            </TableCell>
                            <TableCell sx={{ borderBottom: tableBorder, textAlign: "right", py: 1 }}>
                              {Number(item.amount || 0).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell
                              sx={{
                                borderBottom: tableBorder,
                                textAlign: "right",
                                fontWeight: typographyTokens.fontWeight.bold,
                                color: colorTokens.preschool.mint.dark,
                                py: 1,
                              }}
                            >
                              {Number(item.paid_amount || 0).toLocaleString("en-IN")}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.07) }}>
                          <TableCell
                            colSpan={4}
                            sx={{
                              borderBottom: "none",
                              textAlign: "right",
                              fontWeight: typographyTokens.fontWeight.bold,
                              py: 1.15,
                            }}
                          >
                            Total Paid
                          </TableCell>
                          <TableCell
                            sx={{
                              borderBottom: "none",
                              textAlign: "right",
                              fontWeight: typographyTokens.fontWeight.bold,
                              color: colorTokens.preschool.mint.dark,
                              py: 1.15,
                            }}
                          >
                            {Number(receipt.total_amount || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              )}

              {/* ── Payment Details ────────────────────────────────── */}
              <Box sx={{ mb: 2.75 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                  <SectionIcon
                    icon={<CreditCardOutlinedIcon sx={{ fontSize: 18 }} />}
                    color={colorTokens.preschool.mint.dark}
                  />
                  <Typography
                    sx={{
                      fontWeight: typographyTokens.fontWeight.bold,
                      fontSize: typographyTokens.fontSize.md,
                      color: colorTokens.gray[800],
                    }}
                  >
                    Payment Details
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    borderRadius: `${radiusTokens.xl}px`,
                    border: `1px solid ${alpha(colorTokens.preschool.mint.main, 0.28)}`,
                    bgcolor: alpha(colorTokens.preschool.mint.main, 0.05),
                    overflow: "hidden",
                  }}
                >
                  <Table size="small" data-testid="grid-receipt-payment-details">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(colorTokens.preschool.mint.main, 0.14) }}>
                        {["No.", "Txn Number", "Type", "Bank Name", "Amount (Rs.)"].map((h) => (
                          <TableCell
                            key={h}
                            sx={{
                              fontWeight: typographyTokens.fontWeight.bold,
                              borderBottom: `1px solid ${alpha(colorTokens.preschool.mint.main, 0.28)}`,
                              textAlign: h === "No." ? "center" : h === "Amount (Rs.)" ? "right" : "left",
                              fontSize: typographyTokens.fontSize.sm,
                              color: colorTokens.gray[800],
                              py: 1.15,
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
                          <TableCell sx={{ borderBottom: tableBorder, textAlign: "center", py: 1 }}>
                            {line.sr_no}
                          </TableCell>
                          <TableCell sx={{ borderBottom: tableBorder, py: 1 }}>
                            {line.txn_number || receipt.transaction_number || "N/A"}
                          </TableCell>
                          <TableCell sx={{ borderBottom: tableBorder, py: 1 }}>
                            {line.payment_type || "N/A"}
                          </TableCell>
                          <TableCell sx={{ borderBottom: tableBorder, py: 1 }}>
                            {line.bank_name || "—"}
                          </TableCell>
                          <TableCell
                            sx={{
                              borderBottom: tableBorder,
                              textAlign: "right",
                              fontWeight: typographyTokens.fontWeight.bold,
                              py: 1,
                            }}
                          >
                            {Number(line.amount || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: alpha(colorTokens.preschool.mint.main, 0.1) }}>
                        <TableCell
                          colSpan={4}
                          sx={{
                            borderBottom: "none",
                            textAlign: "right",
                            fontWeight: typographyTokens.fontWeight.bold,
                            py: 1.15,
                          }}
                        >
                          Total Paid
                        </TableCell>
                        <TableCell
                          sx={{
                            borderBottom: "none",
                            textAlign: "right",
                            fontWeight: typographyTokens.fontWeight.bold,
                            py: 1.15,
                          }}
                        >
                          {Number(receipt.total_amount || 0).toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
              </Box>

              {/* ── Footer ─────────────────────────────────────────── */}
              <Box
                className="receipt-print-footer"
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1.2fr 1fr 1fr" },
                  gap: 2,
                  alignItems: "end",
                  pt: 1,
                  borderTop: `1px solid ${colorTokens.border.subtle}`,
                }}
              >
                <Box
                  sx={{
                    borderRadius: `${radiusTokens.xl}px`,
                    bgcolor: alpha(colorTokens.preschool.turquoise.light, 0.1),
                    border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.16)}`,
                    p: 1.5,
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: colorTokens.preschool.turquoise.dark }} />
                    <Typography
                      sx={{
                        fontWeight: typographyTokens.fontWeight.bold,
                        fontSize: typographyTokens.fontSize.sm,
                        color: colorTokens.gray[800],
                      }}
                    >
                      Note
                    </Typography>
                  </Stack>
                  <Box
                    component="ul"
                    sx={{
                      m: 0,
                      pl: 2,
                      "& li": {
                        fontSize: typographyTokens.fontSize.xs,
                        color: colorTokens.text.secondary,
                        lineHeight: typographyTokens.lineHeight.relaxed,
                        mb: 0.35,
                      },
                    }}
                  >
                    <li>This is a system generated receipt and does not require a physical signature.</li>
                    <li>Kindly keep this receipt for your records.</li>
                    <li>Fees once paid are non-refundable unless stated otherwise by school policy.</li>
                  </Box>
                </Box>

                <Stack spacing={0.75} sx={{ px: { sm: 1 } }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SectionIcon icon={<PersonOutlineIcon sx={{ fontSize: 16 }} />} />
                    <Typography
                      sx={{
                        fontWeight: typographyTokens.fontWeight.bold,
                        fontSize: typographyTokens.fontSize.base,
                        color: colorTokens.gray[800],
                      }}
                    >
                      Accounts Officer
                    </Typography>
                  </Stack>
                  <Typography
                    sx={{
                      fontSize: typographyTokens.fontSize.xs,
                      color: colorTokens.text.secondary,
                      pl: 5,
                      lineHeight: typographyTokens.lineHeight.relaxed,
                    }}
                  >
                    Creator: {receipt.created_by_name || "N/A"}
                    <br />
                    Generated: {generatedAt}
                  </Typography>
                </Stack>

                <Box className="receipt-print-thanks" sx={{ textAlign: { xs: "left", sm: "right" }, pb: 0.5 }}>
                  <Typography
                    sx={{
                      fontSize: typographyTokens.fontSize.sm,
                      color: colorTokens.preschool.turquoise.dark,
                      fontWeight: typographyTokens.fontWeight.medium,
                      fontStyle: "italic",
                    }}
                  >
                    Thank you for being a part of our journey
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: typographyTokens.fontSize.xs,
                      color: colorTokens.text.secondary,
                    }}
                  >
                    * Non Refundable
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : null}
        </Paper>
      </Box>
    </ListPageLayout>
  );
}
