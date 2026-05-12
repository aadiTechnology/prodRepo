import type { ReactNode } from "react";
import type { FormConfig } from "../../components/reusable/formFramework.types";
import type { NoticeAudienceType, NoticeType } from "../../types/notice";

export type CreateNoticeFormData = {
  title: string;
  description: string;
  audience_type: NoticeAudienceType;
  class_ids: number[];
  division_ids: number[];
  notice_type: NoticeType;
  publish_date: string;
  expiry_date: string;
  send_notification: boolean;
};

export type SelectOption = { id: string; label: string; value: string };

type CreateNoticeFormConfigArgs = {
  audienceOptions: SelectOption[];
  noticeTypeOptions: SelectOption[];
  applicableSelectionRenderer: ReactNode;
};

export function createNoticeFormConfig({
  audienceOptions,
  noticeTypeOptions,
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
      audience_type: {
        name: "audience_type",
        label: "Audience",
        type: "select",
        required: true,
        props: {
          disableWhenEmpty: false,
          options: audienceOptions.map((o) => ({ id: o.id, value: o.value, label: o.label })),
        },
      },
      notice_type: {
        name: "notice_type",
        label: "Notice Type",
        type: "select",
        required: true,
        props: {
          disableWhenEmpty: false,
          options: noticeTypeOptions.map((o) => ({ id: o.id, value: o.value, label: o.label })),
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
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["audience_type"] },
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["notice_type"] },
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
