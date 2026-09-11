import { apiClient } from "../client";
import type {
  FeePaymentCollectRequest,
  FeePaymentCollectResponse,
  FeeReceiptDetailResponse,
  InvoicePaymentCollectRequest,
  FeePaymentApprovalListParams,
  FeePaymentApprovalListResponse,
} from "../../types/feeCollection";

export async function collectFeePayment(
  payload: FeePaymentCollectRequest
): Promise<FeePaymentCollectResponse> {
  const res = await apiClient.post<FeePaymentCollectResponse>("/fees/collection", payload);
  return res.data;
}

export async function collectInvoiceFeePayment(
  payload: InvoicePaymentCollectRequest
): Promise<FeePaymentCollectResponse> {
  const res = await apiClient.post<FeePaymentCollectResponse>("/fees/collection/invoice", payload);
  return res.data;
}

export async function getFeeReceiptDetail(
  paymentId: number
): Promise<FeeReceiptDetailResponse> {
  const res = await apiClient.get<FeeReceiptDetailResponse>(`/fees/collection/receipt/${paymentId}`);
  return res.data;
}

export async function getInvoiceReceiptDetail(
  invoiceId: number
): Promise<FeeReceiptDetailResponse> {
  const res = await apiClient.get<FeeReceiptDetailResponse>(`/fees/collection/receipt/invoice/${invoiceId}`);
  return res.data;
}

export async function listFeePendingApprovals(
  params: FeePaymentApprovalListParams = {}
): Promise<FeePaymentApprovalListResponse> {
  const res = await apiClient.get<FeePaymentApprovalListResponse>("/fees/pending-approval", { params });
  return res.data;
}

export async function approveFeePendingPayment(paymentId: number): Promise<{ message: string }> {
  const res = await apiClient.post(`/fees/pending-approval/${paymentId}/approve`);
  return res.data;
}

export async function rejectFeePendingPayment(
  paymentId: number,
  reason?: string
): Promise<{ message: string }> {
  const res = await apiClient.post(`/fees/pending-approval/${paymentId}/reject`, { reason });
  return res.data;
}

