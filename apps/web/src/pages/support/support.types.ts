export type SupportStatus = "Not Started" | "In Progress" | "Done" | "TBD";

/** @deprecated Use SupportStatus — kept for FAQ module compatibility */
export type FaqStatus = SupportStatus;

export type FaqLanguage = "English" | "Marathi" | "Hindi";

export type FaqAttachment = {
  id: string;
  name: string;
  type: "pdf" | "image";
  url: string;
};

export type FaqCategoryNode = {
  id: string;
  label: string;
  children?: FaqCategoryNode[];
};

export type FaqItem = {
  id: string;
  srNo: number;
  title: string;
  question: string;
  answer: string;
  module: string;
  categoryId: string;
  categoryPath: string;
  status: SupportStatus;
  owner: string;
  tenantId: number;
  tenantName: string;
  language: FaqLanguage;
  attachments: FaqAttachment[];
  createdAt: string;
  lastModifiedAt: string;
  createdBy: string;
  modifiedBy: string;
};

export type FaqFormData = {
  title: string;
  question: string;
  answer: string;
  module: string;
  categoryId: string;
  status: SupportStatus;
  owner: string;
  tenantName: string;
  language: FaqLanguage;
  attachmentName: string;
};

export type ReleaseNoteFileType = "pdf" | "doc" | "docx";

export type ProductUpdateItem = {
  id: string;
  title: string;
  version: string;
  releaseDate: string;
  description: string;
  status: SupportStatus;
  attachmentName: string;
  attachmentType: ReleaseNoteFileType;
  attachmentUrl: string;
  createdBy: string;
  modifiedBy: string;
  modifiedDate: string;
};

export type ProductUpdateFormData = {
  title: string;
  version: string;
  releaseDate: string;
  description: string;
  status: SupportStatus;
  attachmentName: string;
};

export type HelpVideoItem = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
};

export type HelpDocumentItem = {
  id: string;
  title: string;
  type: "pdf" | "guide";
};
