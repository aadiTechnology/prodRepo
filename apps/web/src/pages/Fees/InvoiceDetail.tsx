import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import { useInvoiceDetailController } from "../../hooks/useInvoiceDetailController";
import {
  invoiceDetailFormConfig,
  type InvoiceDetailFormData,
} from "../../formConfig/invoiceDetailFormConfig";
import type { FormValidationConfig } from "../../utils/formValidation";

function money(v: number): string {
  return `₹${Number(v || 0).toLocaleString()}`;
}

export default function InvoiceDetail() {
  const controller = useInvoiceDetailController();
  const detail = controller.detail;
  const validationConfig = useMemo<FormValidationConfig<InvoiceDetailFormData>>(() => ({}), []);
  const {
    formData,
    setFormData,
    fieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<InvoiceDetailFormData>({
    initialValues: {},
    validationConfig,
    onClearError: () => controller.setError(null),
  });

  const summarySlot = useMemo(
    () =>
      !detail ? null : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {detail.student_info.student_name} | Roll No: {detail.student_info.roll_no || "-"} | Class:{" "}
            {detail.student_info.class_name || "-"} | Invoice: {detail.invoice.invoice_no}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            Installment: {detail.invoice.installment || "-"} | Due Date:{" "}
            {new Date(detail.invoice.due_date).toLocaleDateString()} | Status: {detail.invoice.status}
          </Typography>
        </Paper>
      ),
    [detail]
  );

  const breakupSlot = useMemo(
    () =>
      !detail ? null : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Component</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.fee_breakdown.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.fee_category_name || "-"}</TableCell>
                    <TableCell align="right">{money(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {money(detail.payment_summary.total_amount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ),
    [detail]
  );

  const paymentSummarySlot = useMemo(
    () =>
      !detail ? null : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2">
            Paid: {money(detail.payment_summary.paid_amount)} | Due: {money(detail.payment_summary.due_amount)}
          </Typography>
        </Paper>
      ),
    [detail]
  );

  const paymentHistorySlot = useMemo(
    () =>
      !detail ? null : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          {detail.payment_history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No payment records found
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>Ref No</TableCell>
                    <TableCell align="center">Receipt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.payment_history.map((row) => (
                    <TableRow key={row.payment_id}>
                      <TableCell>{new Date(row.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{money(row.amount)}</TableCell>
                      <TableCell>{row.payment_method}</TableCell>
                      <TableCell>{row.reference_no || "-"}</TableCell>
                      <TableCell align="center">
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => controller.onOpenReceipt(row)}
                          sx={{ textDecoration: "none", fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
                        >
                          Receipt
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      ),
    [controller, detail]
  );

  const actionSlot = useMemo(
    () =>
      !detail ? null : (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={controller.onBack} sx={{ textTransform: "none" }}>
            Back
          </Button>
          <Button variant="outlined" onClick={controller.onPrint} sx={{ textTransform: "none" }}>
            Print
          </Button>
          <Button variant="outlined" onClick={controller.onDownload} sx={{ textTransform: "none" }}>
            Download
          </Button>
          <Button
            variant="contained"
            sx={{ textTransform: "none" }}
            onClick={controller.onPayNow}
            disabled={!detail.available_actions.includes("pay_now")}
          >
            Pay Now
          </Button>
          <Button
            variant="contained"
            sx={{ textTransform: "none" }}
            onClick={controller.onCollectPayment}
            disabled={!detail.available_actions.includes("collect_payment")}
          >
            Collect Payment
          </Button>
        </Box>
      ),
    [controller, detail]
  );

  const formConfig = useMemo(
    () =>
      invoiceDetailFormConfig({
        summarySlot,
        breakupSlot,
        paymentSummarySlot,
        paymentHistorySlot,
        actionSlot,
      }),
    [summarySlot, breakupSlot, paymentSummarySlot, paymentHistorySlot, actionSlot]
  );

  return (
    <>
      <BaseForm<InvoiceDetailFormData>
        formConfig={formConfig}
        formData={formData}
        setFormData={setFormData}
        fieldErrors={fieldErrors}
        handleChange={handleChange}
        handleFieldValueChange={handleFieldValueChange}
        handleSubmit={handleSubmit}
        setFormError={controller.setError}
        onConfirmSubmit={async () => Promise.resolve()}
        isEditMode={false}
        loading={false}
        fetchLoading={controller.loading}
        error={controller.error}
        onErrorDismiss={() => controller.setError(null)}
        snackbar={null}
        onSnackbarClose={() => undefined}
        headerConfig={{
          links: [
            { title: "Invoice List", path: "/fees/invoices" },
            { title: "Invoice Detail", path: "#" },
          ],
          homePath: "/",
          cancelTooltip: "Back",
          saveTooltipCreate: "View",
        }}
        onCancelNavigate={controller.onBack}
        confirmMessage="Open invoice detail"
        submitLabelCreate="View"
        hideFooterActions
        canSubmit={false}
      />

      <Dialog open={controller.receiptOpen} onClose={() => controller.setReceiptOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Receipt</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 700 }}>
            {detail?.invoice.invoice_no || "-"} • Payment #{controller.receiptRow?.payment_id || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Amount: {money(controller.receiptRow?.amount || 0)} • Mode: {controller.receiptRow?.payment_method || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reference: {controller.receiptRow?.reference_no || "-"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => controller.setReceiptOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
