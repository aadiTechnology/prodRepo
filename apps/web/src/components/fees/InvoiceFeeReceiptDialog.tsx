/**
 * Receipt UI intentionally removed.
 * This placeholder preserves the visibility/open-close wiring from Invoice Detail.
 */

import type { InvoiceDetailResponse, InvoiceFeeBreakdownItem } from "../../types/invoice";

export interface InvoiceFeeReceiptDialogProps {
  onClose: () => void;
  detail: InvoiceDetailResponse;
  feeLine: InvoiceFeeBreakdownItem;
  organizationName?: string | null;
  organizationAddressLines?: string[];
}

export default function InvoiceFeeReceiptDialog({
  onClose: _onClose,
  detail: _detail,
  feeLine: _feeLine,
  organizationName: _organizationName,
  organizationAddressLines: _organizationAddressLines = [],
}: InvoiceFeeReceiptDialogProps) {
  return null;
}
