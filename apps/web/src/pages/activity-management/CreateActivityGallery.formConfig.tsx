import type { ReactNode } from "react";
import type { FormConfig } from "../../components/reusable/formFramework.types";

export type CreateActivityGalleryFormData = {
  gallery_name: string;
  activity_date: string;
  class_ids: number[];
  division_ids: number[];
  description: string;
};

export function createActivityGalleryFormConfig(options: {
  associatedClassesSlot?: ReactNode;
  uploadSlot?: ReactNode;
}): FormConfig<CreateActivityGalleryFormData> {
  return {
    fields: {
      gallery_name: {
        name: "gallery_name",
        label: "Gallery Name",
        type: "text",
        placeholder: "Enter activity gallery name",
        required: true,
        props: {
          inputProps: { maxLength: 255 },
          FormHelperTextProps: { sx: { fontSize: "0.875rem", lineHeight: 1.43, mt: 0.75 } },
        },
      },
      activity_date: {
        name: "activity_date",
        label: "Activity Date",
        type: "date",
        required: true,
        props: {
          FormHelperTextProps: { sx: { fontSize: "0.875rem", lineHeight: 1.43, mt: 0.75 } },
        },
      },
      description: {
        name: "description",
        label: "Description",
        type: "text",
        placeholder: "Activity description",
        props: { multiline: true, rows: 4 },
      },
    },
    layoutRows: [
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["gallery_name"] },
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["activity_date"] },
      ...(options.associatedClassesSlot
        ? [
            {
              kind: "custom" as const,
              grid: { xs: 12 },
              render: () => options.associatedClassesSlot,
            },
          ]
        : []),
      { kind: "fields", grid: { xs: 12 }, fieldNames: ["description"] },
      ...(options.uploadSlot
        ? [{ kind: "custom" as const, grid: { xs: 12 }, render: () => options.uploadSlot }]
        : []),
    ],
  };
}
