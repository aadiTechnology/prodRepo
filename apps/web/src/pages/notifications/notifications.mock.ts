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

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationModuleSettings = {
  syllabus: true,
  holiday: true,
  notice: true,
  exam: true,
  general: true,
};
