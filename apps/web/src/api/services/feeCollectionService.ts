import { apiClient } from "../client";
import type {
  FeePaymentCollectRequest,
  FeePaymentCollectResponse,
  InvoicePaymentCollectRequest,
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

