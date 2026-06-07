import {
  AdsClick as AdsClickIcon,
  Article as ArticleIcon,
  Brush as BrushIcon,
  Campaign as CampaignIcon,
  Facebook as FacebookIcon,
  Google as GoogleIcon,
  Instagram as InstagramIcon,
  Language as LanguageIcon,
  YouTube as YouTubeIcon,
  WhatsApp as WhatsAppIcon,
} from "@mui/icons-material";
import { ReactNode, createElement } from "react";

export const MARKETING_CATEGORIES = [
  "All Platforms",
  "Social Media",
  "Advertising",
  "Communication",
  "Branding",
  "Website & Reviews",
] as const;

export type MarketingCategory = (typeof MARKETING_CATEGORIES)[number];

/** @deprecated Use MarketingPlatformFormPage — kept for legacy dialog typings only. */
export type NewPlatformForm = {
  name: string;
  code: string;
  category: string;
  description: string;
  icon_url: string;
  sort_order: number;
};

export const BRAND_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  youtube: "#FF0000",
  whatsapp: "#25D366",
  google_ads: "#4285F4",
  meta_ads: "#0064E0",
  email_campaign: "#FF5A5F",
  canva: "#00C4CC",
  brochure: "#FF9F1C",
  school_website: "#009688",
  google_review: "#F4B400",
  default: "#7C4DFF",
};

export const normalizeIntegrationUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (/^https:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^http:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, "https://");
  }

  return `https://${trimmed.replace(/^\/\//, "")}`;
};

export const validateIntegrationUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = normalizeIntegrationUrl(trimmed);

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:") {
      return "URL must use HTTPS.";
    }
    if (!parsed.hostname) {
      return "Enter a valid HTTPS URL.";
    }
    return null;
  } catch {
    return "Enter a valid HTTPS URL (e.g. https://example.com).";
  }
};

export const getPlatformIcon = (code: string): ReactNode => {
  const iconProps = { sx: { fontSize: 28 } };
  switch (code.toLowerCase()) {
    case "instagram":
      return createElement(InstagramIcon, iconProps);
    case "facebook":
      return createElement(FacebookIcon, iconProps);
    case "youtube":
      return createElement(YouTubeIcon, iconProps);
    case "whatsapp":
      return createElement(WhatsAppIcon, iconProps);
    case "google_ads":
    case "google_review":
      return createElement(GoogleIcon, iconProps);
    case "meta_ads":
      return createElement(AdsClickIcon, iconProps);
    case "email_campaign":
      return createElement(CampaignIcon, iconProps);
    case "canva":
      return createElement(BrushIcon, iconProps);
    case "brochure":
      return createElement(ArticleIcon, iconProps);
    case "school_website":
    default:
      return createElement(LanguageIcon, iconProps);
  }
};

export const getBrandColor = (code: string): string =>
  BRAND_COLORS[code.toLowerCase()] ?? BRAND_COLORS.default;
