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
  audienceTypeRenderer: ReactNode;
  noticeTypeRenderer: ReactNode;
};

export function createNoticeFormConfig({
  audienceOptions,
  noticeTypeOptions,
  applicableSelectionRenderer,
  audienceTypeRenderer,
  noticeTypeRenderer,
}: CreateNoticeFormConfigArgs): FormConfig<CreateNoticeFormData> {
  void audienceOptions;
  void noticeTypeOptions;
  return {
    fields: {
      title: {
        name: "title",
        label: "Notice Title",
        type: "text",
        placeholder: "Enter notice title (max 255 characters)",
        required: true,
        props: { inputProps: { maxLength: 255 } },
        helperText: (ctx) => {
          const len = String(ctx.formData.title ?? "").length;
          return len > 0 ? `${len}/255 characters` : "Maximum 255 characters";
        },
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
        type: "custom",
        required: true,
        render: () => null,
      },
      notice_type: {
        name: "notice_type",
        label: "Notice Type",
        type: "custom",
        required: true,
        render: () => null,
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
      // send_notification: {
      //   name: "send_notification",
      //   label: "Send Notification",
      //   type: "switch",
      // },
    },
    layoutRows: [
      { kind: "fields", grid: { xs: 12 }, fieldNames: ["title"] },
      { kind: "fields", grid: { xs: 12 }, fieldNames: ["description"] },
      { kind: "custom", grid: { xs: 12, sm: 6 }, render: () => audienceTypeRenderer },
      { kind: "custom", grid: { xs: 12, sm: 6 }, render: () => noticeTypeRenderer },
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
