import type { ReactNode } from "react";
import type { FormConfig } from "../../components/reusable/formFramework.types";
import { formatClassDisplayLabel } from "../../utils/formatters";

export type AddHomeworkFormData = {
  academic_year_id: string;
  class_id: string;
  class_division_id: string;
  subject_id: string;
  title: string;
  instructions: string;
  assigned_date: string;
  submission_date: string;
  notify_parents: boolean;
  status: string;
};

type Options = { label: string; value: string }[];

/** @deprecated Use `formatClassDisplayLabel` from `utils/formatters`. */
export function formatHomeworkClassLabel(name: string): string {
  return formatClassDisplayLabel(name);
}

export const createHomeworkFormConfig = (options: {
  classOptions: Options;
  divisionOptions: Options;
  subjectOptions: Options;
  classSelected: boolean;
  attachmentSlot?: ReactNode;
}): FormConfig<AddHomeworkFormData> => ({
  fields: {
    class_id: {
      name: "class_id",
      label: "Class",
      type: "select",
      required: true,
      props: {
        options: options.classOptions,
        placeholder: "Select Class",
      },
    },
    class_division_id: {
      name: "class_division_id",
      label: "Division",
      type: "select",
      required: false,
      props: {
        options: options.divisionOptions,
        placeholder: options.classSelected ? "Select Division" : "Select class first",
        disabled: !options.classSelected,
      },
    },
    subject_id: {
      name: "subject_id",
      label: "Subject",
      type: "select",
      required: true,
      props: {
        options: options.subjectOptions,
        placeholder: options.classSelected ? "Select Subject" : "Select class first",
        disabled: !options.classSelected || !options.subjectOptions.length,
      },
    },
    title: {
      name: "title",
      label: "Homework Title",
      type: "text",
      placeholder: "Enter homework title",
      required: true,
      // DB title column is NVARCHAR(255)
      props: {
        htmlInput: { maxLength: 255 },
      },
    },
    instructions: {
      name: "instructions",
      label: "Instructions",
      type: "text",
      placeholder: "Describe the homework task, objectives, or any instructions for students...",
      required: false,
      props: {
        multiline: true,
        rows: 4,
      },
    },
    assigned_date: {
      name: "assigned_date",
      label: "Assigned Date",
      type: "date",
      required: true,
    },
    // Submission Date hidden on request. Field kept (optional end-to-end) so
    // homework saves submission_date as null; uncomment both this and the
    // layoutRows entry below to restore.
    // submission_date: {
    //   name: "submission_date",
    //   label: "Submission Date",
    //   type: "date",
    //   required: false,
    // },
  },

  layoutRows: [
    { kind: "section", title: "Class & Subject", grid: { xs: 12 } },
    { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["class_id"] },
    { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["class_division_id"] },
    { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["subject_id"] },
    { kind: "section", title: "Homework Title", grid: { xs: 12 } },
    { kind: "fields", grid: { xs: 12 }, fieldNames: ["title"] },
    { kind: "fields", grid: { xs: 12 }, fieldNames: ["instructions"] },
    { kind: "section", title: "Schedule", grid: { xs: 12 } },
    { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["assigned_date"] },
    // { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["submission_date"] },
    ...(options.attachmentSlot
      ? [
          {
            kind: "custom" as const,
            grid: { xs: 12 },
            render: () => options.attachmentSlot ?? null,
          },
        ]
      : []),
  ],
});
