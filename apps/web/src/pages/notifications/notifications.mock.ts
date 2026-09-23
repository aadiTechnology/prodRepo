/**
 * Shared constants for notification UI deep-links and module labels.
 * Inbox data is loaded from the API (not hardcoded).
 */

import type {
  NotificationModule,
  NotificationModuleSettings,
} from "./notification.types";

export const NOTIFICATION_MODULE_ORDER: NotificationModule[] = [
  "syllabus",
  "holiday",
  "notice",
  "exam",
];

export const NOTIFICATION_MODULE_LABELS: Record<NotificationModule, string> = {
  syllabus: "Syllabus Management",
  holiday: "Holiday",
  notice: "Notice",
  exam: "Exam",
  general: "General",
};

/** Deep-link destination for each notification module (existing app routes). */
export const NOTIFICATION_MODULE_PATHS: Record<NotificationModule, string> = {
  syllabus: "/academics/syllabus",
  holiday: "/academics/configuration/holidays",
  notice: "/communication/notices",
  exam: "/calendar/academic",
  general: "/notifications",
};

/** Fee due reminder / day notifications deep-link to Fee List. */
export const FEE_NOTIFICATION_PATH = "/fees/invoices";

/**
 * Resolve in-app route for a notification tap.
 * Fee due reminders (source_key fee:… or Fee title) → Fee List.
 */
export function resolveNotificationDeepLink(notification: {
  module: NotificationModule;
  title?: string;
  sourceKey?: string | null;
}): string {
  const sourceKey = (notification.sourceKey || "").trim().toLowerCase();
  if (sourceKey.startsWith("fee:")) {
    return FEE_NOTIFICATION_PATH;
  }
  const title = (notification.title || "").trim().toLowerCase();
  if (
    title.startsWith("fee due") ||
    title.startsWith("fee overdue") ||
    title.startsWith("fee reminder") ||
    title.startsWith("fee payment")
  ) {
    return FEE_NOTIFICATION_PATH;
  }
  return NOTIFICATION_MODULE_PATHS[notification.module] ?? NOTIFICATION_MODULE_PATHS.general;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationModuleSettings = {
  syllabus: true,
  holiday: true,
  notice: true,
  exam: true,
  general: true,
};
