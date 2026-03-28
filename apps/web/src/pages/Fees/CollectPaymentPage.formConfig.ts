/**
 * CollectPaymentPage Form Configuration
 *
 * Defines the form structure, field definitions, and layout for the
 * collect payment form using the BaseForm pattern.
 */

export interface CollectPaymentFormData {
  amount_to_collect: number;
  payment_method: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";
  reference_no: string;
  notes: string;
  allocation_mode: "full" | "custom";
  [key: string]: any;
}

interface CollectPaymentFormConfigOptions {
  maxBalance: number;
  collectFullBalance: boolean;
}

/**
 * Creates form configuration for the collect payment page
 */
export function createCollectPaymentFormConfig({
  maxBalance,
  collectFullBalance,
}: CollectPaymentFormConfigOptions) {
  return {
    fields: {
      amount_to_collect: {
        name: "amount_to_collect",
        label: "Amount to Collect",
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
          },
          disabled: collectFullBalance,
        },
      },

      payment_method: {
        name: "payment_method",
        label: "Payment Method",
        type: "select" as const,
        required: true,
        props: {
          options: [
            { label: "Cash", value: "CASH" },
            { label: "UPI", value: "UPI" },
            { label: "Card", value: "CARD" },
            { label: "Bank Transfer", value: "BANK_TRANSFER" },
          ],
        },
      },

      reference_no: {
        name: "reference_no",
        label: "Reference No",
        type: "text" as const,
        placeholder: "e.g., Check No, Transaction ID",
        required: false,
        helperText: "Optional",
      },

      notes: {
        name: "notes",
        label: "Notes",
        type: "text" as const,
        placeholder: "Additional notes about this payment",
        required: false,
        helperText: "Optional",
        props: {
          multiline: true,
          rows: 3,
        },
      },

      allocation_mode: {
        name: "allocation_mode",
        label: "Allocation Mode",
        type: "switch" as const,
        helperText: "Toggle to collect full balance or custom amount",
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
