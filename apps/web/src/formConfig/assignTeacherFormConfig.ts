import type { FormConfig } from "../components/reusable/formFramework.types";
import type { SelectItemOption } from "../components/semantic";

export type AssignTeacherFormData = {
  academic_year_id: number | null;
  class_id: number | null;
  class_division_ids: number[];
  teacher_id: number | null;
  subject_id: number | null;
};

type AssignTeacherFormConfigArgs = {
  academicYearOptions: SelectItemOption[];
  classOptions: SelectItemOption[];
  divisionOptions: SelectItemOption[];
  teacherOptions: SelectItemOption[];
  subjectOptions: SelectItemOption[];
  academicYearsLoading: boolean;
  classesLoading: boolean;
  divisionsLoading: boolean;
  teachersLoading: boolean;
  subjectsLoading: boolean;
  disableClass: boolean;
  disableDivision: boolean;
  disableTeacher: boolean;
  disableSubject: boolean;
  hideClassFields?: boolean;
};

export function assignTeacherFormConfig({
  academicYearOptions,
  classOptions,
  divisionOptions,
  teacherOptions,
  subjectOptions,
  academicYearsLoading,
  classesLoading,
  divisionsLoading,
  teachersLoading,
  subjectsLoading,
  disableClass,
  disableDivision,
  disableTeacher,
  disableSubject,
  hideClassFields = false,
}: AssignTeacherFormConfigArgs): FormConfig<AssignTeacherFormData> {
  const classFieldRows: FormConfig<AssignTeacherFormData>["layoutRows"] = hideClassFields
    ? []
    : [
        {
          kind: "fields",
          grid: { xs: 12, md: 6 },
          fieldNames: ["class_id"],
        },
        {
          kind: "fields",
          grid: { xs: 12, md: 6 },
          fieldNames: ["class_division_ids"],
        },
      ];

  return {
    fields: {
      academic_year_id: {
        name: "academic_year_id",
        label: "Academic Year",
        type: "select",
        required: true,
        props: {
          options: academicYearOptions,
          loading: academicYearsLoading,
          emptyOptionLabel: "Select Academic Year",
          disabled: academicYearsLoading,
          coerceToNumber: true,
        },
      },
      class_id: {
        name: "class_id",
        label: "Class",
        type: "select",
        required: true,
        props: {
          options: classOptions,
          loading: classesLoading,
          emptyOptionLabel: "Select Class",
          disabled: disableClass,
          coerceToNumber: true,
        },
      },
      class_division_ids: {
        name: "class_division_ids",
        label: "Division",
        type: "select",
        required: true,
        props: {
          options: divisionOptions,
          loading: divisionsLoading,
          disabled: disableDivision,
          multiple: true,
          coerceToNumberArray: true,
        },
      },
      teacher_id: {
        name: "teacher_id",
        label: "Teacher",
        type: "select",
        required: true,
        props: {
          options: teacherOptions,
          loading: teachersLoading,
          emptyOptionLabel: "Select Teacher",
          disabled: disableTeacher,
          coerceToNumber: true,
        },
      },
      subject_id: {
        name: "subject_id",
        label: "Subject",
        type: "select",
        required: false,
        helperText:
          "Leave blank for Class Teacher (one per division). Select a subject to assign that teacher across multiple classes/divisions in one save.",
        props: {
          options: subjectOptions,
          loading: subjectsLoading,
          emptyOptionLabel: "Class Teacher (no subject)",
          disabled: disableSubject,
          coerceToNumber: true,
        },
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["academic_year_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["teacher_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["subject_id"],
      },
      ...classFieldRows,
    ],
  };
}
