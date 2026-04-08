import type { FormConfig } from "../../components/reusable/formFramework.types";

export type SprintFormData = {
  sprint_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export function createSprintFormConfig(): FormConfig<SprintFormData> {
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
        label: "Active",
        type: "switch",
      },
    },
    layoutRows: [
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["sprint_name", "is_active"] },
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["start_date", "end_date"] },
    ],
  };
}

