import type { ReactNode } from "react";
import type { FormConfig } from "../../components/reusable/formFramework.types";
import LabeledSwitch from "../../components/semantic/LabeledSwitch";

export type SprintFormData = {
  sprint_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_completed: boolean;
};

export type SprintLifecycleHandlers = {
  onActiveChange: (value: boolean) => void;
  onCompletedChange: (value: boolean) => void;
};

export function createSprintFormConfig(
  handlers: SprintLifecycleHandlers,
  extra?: { assignmentsSection?: ReactNode }
): FormConfig<SprintFormData> {
  return {
    fields: {
      sprint_name: {
        name: "sprint_name",
        label: "Sprint Name",
        type: "text",
        required: true,
        placeholder: "e.g. Sprint 12",
      },
      start_date: {
        name: "start_date",
        label: "Start Date",
        type: "custom",
        render: (ctx) => (
          <input
            type="date"
            value={String(ctx.formData.start_date || "")}
            onChange={(e) => ctx.handleFieldValueChange("start_date", e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
        ),
      },
      end_date: {
        name: "end_date",
        label: "End Date",
        type: "custom",
        render: (ctx) => (
          <input
            type="date"
            value={String(ctx.formData.end_date || "")}
            onChange={(e) => ctx.handleFieldValueChange("end_date", e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
        ),
      },
      is_active: {
        name: "is_active",
        label: "Active (only one per project)",
        type: "custom",
        render: (ctx) => (
          <LabeledSwitch
            label="Active (only one per project)"
            name="is_active"
            checked={Boolean(ctx.formData.is_active)}
            disabled={Boolean(ctx.formData.is_completed)}
            onChange={(e) => handlers.onActiveChange(e.target.checked)}
          />
        ),
      },
      is_completed: {
        name: "is_completed",
        label: "Completed",
        type: "custom",
        render: (ctx) => (
          <LabeledSwitch
            label="Completed"
            name="is_completed"
            checked={Boolean(ctx.formData.is_completed)}
            disabled={Boolean(ctx.formData.is_active)}
            onChange={(e) => handlers.onCompletedChange(e.target.checked)}
          />
        ),
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["sprint_name", "is_active", "is_completed"],
      },
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["start_date", "end_date"] },
      ...(extra?.assignmentsSection
        ? ([
            {
              kind: "custom",
              grid: { xs: 12 },
              show: () => true,
              render: () => extra.assignmentsSection as any,
            },
          ] as any)
        : []),
    ],
  };
}

