import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import invoiceService from "../api/services/invoiceService";
import type { InvoiceDetailResponse } from "../types/invoice";

export function useInvoiceDetailController() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetailResponse | null>(null);

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

  const onCollectPayment = useCallback((invoiceId?: number) => {
    const targetId = invoiceId || detail?.invoice?.id;
    if (!targetId) return;
    navigate("/fees/collect-payment", {
      state: {
        invoice_id: targetId,
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

  const onOpenReceiptForFeeLine = useCallback((paymentId?: number) => {
    if (!paymentId || paymentId <= 0) {
      setError("Receipt not found");
      return;
    }

    const row = detail?.fee_breakdown?.find((item) => item.payment_id === paymentId);
    if (row?.payment_status && row.payment_status !== "completed") {
      setError("Receipt is available only after payment approval.");
      return;
    }
    navigate(`/fees/receipt/${paymentId}`, {
      state: { invoice_id: numericInvoiceId },
    });
  }, [navigate, numericInvoiceId, detail?.fee_breakdown]);

  const getPrimaryPaymentId = useCallback(() => {
    const history = detail?.payment_history ?? [];
    if (!history.length) {
      return null;
    }
    // Use latest payment for current invoice installment context.
    // All fee rows in this invoice belong to the same installment, so this avoids wrong row-index mapping.
    return history[0]?.payment_id ?? null;
  }, [detail?.payment_history]);

  const onOpenFullReceipt = useCallback(() => {
    if (!Number.isFinite(numericInvoiceId) || numericInvoiceId <= 0) {
      setError("Receipt not found");
      return;
    }
    navigate(`/fees/receipt/invoice/${numericInvoiceId}`, {
      state: { invoice_id: numericInvoiceId, scope: "invoice" },
    });
  }, [navigate, numericInvoiceId]);

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
    onOpenReceiptForFeeLine,
    getPrimaryPaymentId,
    onOpenFullReceipt,
  };
}
