import type { FormConfig } from "../../components/reusable/formFramework.types";

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
  // "Draft" | "Published" — controlled programmatically, not rendered as a field
  status: string;
};

type Options = { label: string; value: string }[];

export const createHomeworkFormConfig = (options: {
  academicYearOptions: Options;
  classOptions: Options;
  divisionOptions: Options;
  subjectOptions: Options;
  academicYearSelected: boolean;
  classSelected: boolean;
}): FormConfig<AddHomeworkFormData> => ({
  fields: {
    academic_year_id: {
      name: "academic_year_id",
      label: "Academic Year",
      type: "select",
      required: true,
      props: {
        options: options.academicYearOptions,
        placeholder: "Select Academic Year",
      },
    },
    class_id: {
      name: "class_id",
      label: "Class",
      type: "select",
      required: true,
      props: {
        options: options.classOptions,
        placeholder: options.academicYearSelected ? "Select Class" : "Select academic year first",
        disabled: !options.academicYearSelected,
      },
    },
    class_division_id: {
      name: "class_division_id",
      label: "Division",
      type: "select",
      required: false,
      props: {
        options: options.divisionOptions,
        placeholder: !options.academicYearSelected
          ? "Select academic year first"
          : !options.classSelected
          ? "Select class first"
          : "Select Division",
        disabled: !options.academicYearSelected || !options.classSelected,
      },
    },
    subject_id: {
      name: "subject_id",
      label: "Subject",
      type: "select",
      required: true,
      props: {
        options: options.subjectOptions,
        placeholder: !options.academicYearSelected
          ? "Select academic year first"
          : !options.classSelected
          ? "Select class first"
          : "Select Subject",
        disabled: !options.academicYearSelected || !options.classSelected || !options.subjectOptions.length,
      },
    },
    title: {
      name: "title",
      label: "Homework Title",
      type: "text",
      placeholder: "Enter homework title",
      required: true,
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
    submission_date: {
      name: "submission_date",
      label: "Submission Date",
      type: "date",
      required: true,
    },
    notify_parents: {
      name: "notify_parents",
      label: "Notify Students / Parents",
      type: "switch",
      required: false,
    },
  },

  layoutRows: [
    { kind: "section", title: "Class & Subject", grid: { xs: 12 } },
    { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["academic_year_id"] },
    { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["class_id"] },
    { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["class_division_id"] },
    { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["subject_id"] },
    { kind: "section", title: "Homework Details", grid: { xs: 12 } },
    { kind: "fields", grid: { xs: 12 }, fieldNames: ["title"] },
    { kind: "fields", grid: { xs: 12 }, fieldNames: ["instructions"] },
    { kind: "section", title: "Schedule", grid: { xs: 12 } },
    { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["assigned_date"] },
    { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["submission_date"] },
    { kind: "section", title: "Notification", grid: { xs: 12 } },
    { kind: "fields", grid: { xs: 12 }, fieldNames: ["notify_parents"] },
  ],
});
