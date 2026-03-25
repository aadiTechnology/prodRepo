import { apiClient } from "../client";
import type {
  FeePaymentCollectRequest,
  FeePaymentCollectResponse,
} from "../../types/feeCollection";

export async function collectFeePayment(
  payload: FeePaymentCollectRequest
): Promise<FeePaymentCollectResponse> {
  const res = await apiClient.post<FeePaymentCollectResponse>("/fees/collection", payload);
  return res.data;
}

