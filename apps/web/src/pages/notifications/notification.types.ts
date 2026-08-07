/** In-app notification modules supported by the prototype. */
export type NotificationModule = "syllabus" | "holiday" | "notice" | "exam" | "general";

/** Holiday / exam generated kinds; other modules use general. */
export type NotificationKind = "reminder" | "day" | "general";

export type AppNotification = {
  id: string;
  module: NotificationModule;
  title: string;
  message: string;
  /** ISO timestamp for display and sorting. */
  createdAt: string;
  isRead: boolean;
  kind: NotificationKind;
};

export type NotificationModuleSettings = Record<NotificationModule, boolean>;

export type NotificationEventSeed = {
  id: string;
  module: "holiday" | "exam";
  name: string;
  /** Calendar day of the event (time ignored; local date used for filtering). */
  eventDate: string;
};
