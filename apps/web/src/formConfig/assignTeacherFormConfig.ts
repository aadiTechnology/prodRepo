import type { FormConfig } from "../components/reusable/formFramework.types";
import type { SelectItemOption } from "../components/semantic";

export type AssignTeacherFormData = {
  academic_year_id: number | null;
  class_id: number | null;
  class_division_id: number | null;
  teacher_id: number | null;
};

type AssignTeacherFormConfigArgs = {
  academicYearOptions: SelectItemOption[];
  classOptions: SelectItemOption[];
  divisionOptions: SelectItemOption[];
  teacherOptions: SelectItemOption[];
  academicYearsLoading: boolean;
  classesLoading: boolean;
  divisionsLoading: boolean;
  teachersLoading: boolean;
  disableClass: boolean;
  disableDivision: boolean;
  disableTeacher: boolean;
};

export function assignTeacherFormConfig({
  academicYearOptions,
  classOptions,
  divisionOptions,
  teacherOptions,
  academicYearsLoading,
  classesLoading,
  divisionsLoading,
  teachersLoading,
  disableClass,
  disableDivision,
  disableTeacher,
}: AssignTeacherFormConfigArgs): FormConfig<AssignTeacherFormData> {
  return {
    fields: {
      academic_year_id: {
        name: "academic_year_id",
        label: "Academic Year",
        type: "select",
        required: true,
        helperText: "Select academic year",
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
        helperText: "Select class",
        props: {
          options: classOptions,
          loading: classesLoading,
          emptyOptionLabel: "Select Class",
          disabled: disableClass,
          coerceToNumber: true,
        },
      },
      class_division_id: {
        name: "class_division_id",
        label: "Division",
        type: "select",
        required: true,
        helperText: "Select division",
        props: {
          options: divisionOptions,
          loading: divisionsLoading,
          emptyOptionLabel: "Select Division",
          disabled: disableDivision,
          coerceToNumber: true,
        },
      },
      teacher_id: {
        name: "teacher_id",
        label: "Teacher",
        type: "select",
        required: true,
        helperText: "Select class teacher",
        props: {
          options: teacherOptions,
          loading: teachersLoading,
          emptyOptionLabel: "Select Teacher",
          disabled: disableTeacher,
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
        fieldNames: ["class_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["class_division_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["teacher_id"],
      },
    ],
  };
}
