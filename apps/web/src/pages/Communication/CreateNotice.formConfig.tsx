import type { ReactNode } from "react";
import type { FormConfig } from "../../components/reusable/formFramework.types";

export type CreateNoticeFormData = {
  title: string;
  description: string;
  class_ids: number[];
  division_ids: number[];
  notice_type: "General" | "Fee" | "Event" | "Holiday";
  publish_date: string;
  expiry_date: string;
  send_notification: boolean;
};

type Option = { id: string; label: string; value: string };

type CreateNoticeFormConfigArgs = {
  applicableSelectionRenderer: ReactNode;
};

export function createNoticeFormConfig({
  applicableSelectionRenderer,
}: CreateNoticeFormConfigArgs): FormConfig<CreateNoticeFormData> {
  return {
    fields: {
      title: {
        name: "title",
        label: "Notice Title",
        type: "text",
        placeholder: "Enter notice title",
        required: true,
      },
      description: {
        name: "description",
        label: "Description",
        type: "text",
        placeholder: "Enter detailed notice message",
        required: true,
        props: { multiline: true, rows: 4 },
      },
      notice_type: {
        name: "notice_type",
        label: "Notice Type",
        type: "select",
        required: true,
        props: {
          disableWhenEmpty: false,
          options: [
            { id: "General", value: "General", label: "General" },
            { id: "Fee", value: "Fee", label: "Fee" },
            { id: "Event", value: "Event", label: "Event" },
            { id: "Holiday", value: "Holiday", label: "Holiday" },
          ],
        },
      },
      publish_date: {
        name: "publish_date",
        label: "Publish Date",
        type: "date",
        required: true,
      },
      expiry_date: {
        name: "expiry_date",
        label: "Expiry Date",
        type: "date",
        required: false,
      },
      send_notification: {
        name: "send_notification",
        label: "Send Notification",
        type: "switch",
      },
    },
    layoutRows: [
      { kind: "fields", grid: { xs: 12 }, fieldNames: ["title"] },
      { kind: "fields", grid: { xs: 12 }, fieldNames: ["description"] },
      { kind: "fields", grid: { xs: 12 }, fieldNames: ["notice_type"] },
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["publish_date"] },
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["expiry_date"] },
      {
        kind: "custom",
        grid: { xs: 12 },
        render: () => applicableSelectionRenderer,
      },
      { kind: "fields", grid: { xs: 12 }, fieldNames: ["send_notification"] },
    ],
  };
}
