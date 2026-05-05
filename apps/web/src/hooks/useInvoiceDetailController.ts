import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import invoiceService from "../api/services/invoiceService";
import type { InvoiceDetailResponse, InvoiceFeeBreakdownItem } from "../types/invoice";

export function useInvoiceDetailController() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetailResponse | null>(null);
  const [receiptFeeLine, setReceiptFeeLine] = useState<InvoiceFeeBreakdownItem | null>(null);

  const numericInvoiceId = useMemo(() => Number(invoiceId), [invoiceId]);

  const fetchDetail = useCallback(async () => {
    if (!Number.isFinite(numericInvoiceId) || numericInvoiceId <= 0) {
      setError("Invalid invoice ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await invoiceService.getInvoiceDetailById(numericInvoiceId);
      setDetail(response);
    } catch (err: any) {
      setDetail(null);
      setError(err?.message || "Unable to load invoice details");
    } finally {
      setLoading(false);
    }
  }, [numericInvoiceId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const onBack = useCallback(() => {
    navigate("/fees/invoices");
  }, [navigate]);

  const onCollectPayment = useCallback(() => {
    const invoice = detail?.invoice;
    if (!invoice) return;
    navigate("/fees/collect-payment", {
      state: {
        invoice_id: invoice.id,
      },
    });
  }, [detail, navigate]);

  const onPayNow = onCollectPayment;

  const onPrint = useCallback(() => {
    window.print();
  }, []);

  const onDownload = useCallback(() => {
    window.print();
  }, []);

  const onOpenReceiptForFeeLine = useCallback((row: InvoiceFeeBreakdownItem) => {
    setReceiptFeeLine(row);
  }, []);

  const onCloseReceipt = useCallback(() => {
    setReceiptFeeLine(null);
  }, []);

  return {
    loading,
    error,
    setError,
    detail,
    fetchDetail,
    onBack,
    onCollectPayment,
    onPayNow,
    onPrint,
    onDownload,
    receiptFeeLine,
    onOpenReceiptForFeeLine,
    onCloseReceipt,
  };
}
