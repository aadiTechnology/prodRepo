/**
 * CollectPaymentPage Form Configuration
 *
 * Defines the form structure, field definitions, and layout for the
 * collect payment form using the BaseForm pattern.
 */

export interface CollectPaymentFormData {
  amount_to_collect: number;
  payment_method: "CASH" | "UPI" | "BANK_TRANSFER";
  reference_no: string;
  payment_date: string;
  notes: string;
  allocation_mode: "full" | "custom";
  bank_account_holder_name?: string;
  bank_account_no?: string;
  ifsc_code?: string;
  [key: string]: any;
}

interface CollectPaymentFormConfigOptions {
  maxBalance: number;
  collectFullBalance: boolean;
  paymentMethod: CollectPaymentFormData["payment_method"];
}

/**
 * Creates form configuration for the collect payment page
 */
export function createCollectPaymentFormConfig({
  maxBalance,
  collectFullBalance,
  paymentMethod,
}: CollectPaymentFormConfigOptions) {
  const isCashPayment = paymentMethod === "CASH";
  const isBankTransfer = paymentMethod === "BANK_TRANSFER";
  const referenceFieldConfig = (() => {
    if (paymentMethod === "UPI") {
      return {
        label: "UPI Transaction ID",
        placeholder: "Enter UPI transaction ID",
        helperText: "Required for UPI payments",
      };
    }
    if (paymentMethod === "BANK_TRANSFER") {
      return {
        label: "Bank Transfer Reference",
        placeholder: "Enter UTR / NEFT / IMPS reference number",
        helperText: "Required for bank transfer payments",
      };
    }
    return {
      label: "Reference No",
      placeholder: "Reference not needed for cash payment",
      helperText: "Not required for cash payments",
    };
  })();
  return {
    fields: {
      amount_to_collect: {
        name: "amount_to_collect",
        label: "Payment Amount",
        type: "text" as const,
        placeholder: "Enter amount",
        required: true,
        helperText: `Maximum balance: ₹${Number(maxBalance || 0).toLocaleString()}`,
        props: {
          htmlInput: {
            type: "number" as const,
            min: 0,
            step: 1,
            max: maxBalance,
            "data-testid": "input-amount-to-collect",
          },
          disabled: collectFullBalance,
        },
      },

      payment_method: {
        name: "payment_method",
        label: "Payment Mode",
        type: "select" as const,
        required: true,
        props: {
          options: [
            { label: "Cash", value: "CASH" },
            { label: "UPI", value: "UPI" },
            { label: "Bank Transfer", value: "BANK_TRANSFER" },
          ],
          "data-testid": "input-payment-method",
        },
      },

      reference_no: {
        name: "reference_no",
        label: paymentMethod === "UPI" ? "UPI Transaction ID" : paymentMethod === "BANK_TRANSFER" ? "Bank Transfer Reference" : "Reference No",
        type: "text" as const,
        placeholder: referenceFieldConfig.placeholder,
        required: !isCashPayment,
        helperText: referenceFieldConfig.helperText,
        props: {
          disabled: isCashPayment,
          htmlInput: { "data-testid": "input-reference-no" },
        },
      },

      payment_date: {
        name: "payment_date",
        label: "Payment Date",
        type: "date" as const,
        required: true,
        props: {
          htmlInput: { "data-testid": "input-payment-date" },
        },
      },

      bank_account_holder_name: {
        name: "bank_account_holder_name",
        label: "Account Holder Name",
        type: "text" as const,
        placeholder: "Enter account holder name",
        required: isBankTransfer,
        helperText: "Required for bank transfer payments",
        props: {
          disabled: !isBankTransfer,
          htmlInput: { "data-testid": "input-bank-account-holder-name" },
        },
      },

      bank_account_no: {
        name: "bank_account_no",
        label: "Bank Account Number",
        type: "text" as const,
        placeholder: "Enter account number",
        required: isBankTransfer,
        helperText: "Required for bank transfer payments",
        props: {
          disabled: !isBankTransfer,
          htmlInput: { "data-testid": "input-bank-account-no" },
        },
      },

      ifsc_code: {
        name: "ifsc_code",
        label: "IFSC Code",
        type: "text" as const,
        placeholder: "Enter IFSC code (e.g., SBIN0000001)",
        required: isBankTransfer,
        helperText: "Required for bank transfer payments",
        props: {
          disabled: !isBankTransfer,
          maxLength: 11,
          htmlInput: { "data-testid": "input-ifsc-code" },
        },
      },

      notes: {
        name: "notes",
        label: "Remarks",
        type: "text" as const,
        placeholder: "Additional notes about this payment",
        required: false,
        helperText: "Optional",
        props: {
          multiline: true,
          rows: 3,
          htmlInput: { "data-testid": "input-notes" },
        },
      },

      allocation_mode: {
        name: "allocation_mode",
        label: "Allocation Mode",
        type: "switch" as const,
        helperText: "Toggle to collect full balance or custom amount",
        props: {
          inputTestId: "input-allocation-mode",
        },
      },
    },

    layoutRows: [
      {
        kind: "fields" as const,
        grid: { xs: 12 } as any,
        fieldNames: ["amount_to_collect"] as any,
      },
      {
        kind: "fields" as const,
        grid: { xs: 12, sm: 6 } as any,
        fieldNames: ["payment_method"] as any,
      },
      {
        kind: "fields" as const,
        grid: { xs: 12, sm: 6 } as any,
        fieldNames: ["reference_no"] as any,
      },
      {
        kind: "fields" as const,
        grid: { xs: 12, sm: 6 } as any,
        fieldNames: ["payment_date"] as any,
      },
      {
        kind: "fields" as const,
        grid: { xs: 12, sm: 6 } as any,
        fieldNames: ["bank_account_holder_name"] as any,
      },
      {
        kind: "fields" as const,
        grid: { xs: 12, sm: 6 } as any,
        fieldNames: ["bank_account_no"] as any,
      },
      {
        kind: "fields" as const,
        grid: { xs: 12, sm: 6 } as any,
        fieldNames: ["ifsc_code"] as any,
      },
      {
        kind: "fields" as const,
        grid: { xs: 12 } as any,
        fieldNames: ["notes"] as any,
      },
      {
        kind: "fields" as const,
        grid: { xs: 12 } as any,
        fieldNames: ["allocation_mode"] as any,
      },
    ],
  };
}
