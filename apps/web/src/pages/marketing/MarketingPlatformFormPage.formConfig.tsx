import {
  CampaignOutlined as CampaignOutlinedIcon,
  LinkOutlined as LinkOutlinedIcon,
} from "@mui/icons-material";
import type { FormConfig } from "../../components/reusable/formFramework.types";
import { MARKETING_CATEGORIES } from "./marketingHub.utils";

export type MarketingPlatformFormData = {
  name: string;
  code: string;
  category: string;
  description: string;
  sort_order: number;
  integration_url: string;
  link_active: boolean;
};

type FormConfigArgs = {
  isEditMode: boolean;
};

const categoryOptions = MARKETING_CATEGORIES.slice(1).map((category) => ({
  label: category,
  value: category,
}));

export function createMarketingPlatformFormConfig({
  isEditMode,
}: FormConfigArgs): FormConfig<MarketingPlatformFormData> {
  return {
    fields: {
      name: {
        name: "name",
        label: "Platform Name",
        type: "text",
        placeholder: "e.g. TikTok",
        required: true,
      },
      code: {
        name: "code",
        label: "Unique Code Key",
        type: "text",
        placeholder: "e.g. tiktok",
        required: true,
        props: { disabled: isEditMode },
      },
      category: {
        name: "category",
        label: "Category",
        type: "select",
        required: true,
        props: {
          options: categoryOptions,
          disableWhenEmpty: false,
        },
      },
      description: {
        name: "description",
        label: "Description",
        type: "text",
        placeholder: "Short description of the platform",
        props: { multiline: true, rows: 3 },
      },
      sort_order: {
        name: "sort_order",
        label: "Sort Order",
        type: "text",
        props: { htmlInput: { type: "number", min: 0, step: 1 } },
        helperText: "Lower numbers appear first (e.g. 1, then 2, then 3).",
      },
      integration_url: {
        name: "integration_url",
        label: "Integration Link (HTTPS)",
        type: "text",
        placeholder: "https://example.com",
        helperText: "HTTPS only. Leave empty to remove an existing link.",
      },
      link_active: {
        name: "link_active",
        label: "Link Active",
        type: "switch",
        helperText: "Inactive links cannot redirect users",
      },
    },
    layoutRows: [
      {
        kind: "section",
        title: "Platform Details",
        icon: <CampaignOutlinedIcon fontSize="small" />,
        grid: { xs: 12 },
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["name"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["code"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["category"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["sort_order"],
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["description"],
      },
      {
        kind: "section",
        title: "Integration Link",
        icon: <LinkOutlinedIcon fontSize="small" />,
        grid: { xs: 12 },
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["integration_url"],
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["link_active"],
      },
    ],
  };
}
