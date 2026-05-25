import {
  isHomeworkReadOnlyAudience,
  isParentHomeworkUser,
  isStudentHomeworkUser,
} from "./homeworkAudience";

export { isHomeworkReadOnlyAudience as isInvoiceReadOnlyAudience };
export { isStudentHomeworkUser as isStudentInvoiceUser };
export { isParentHomeworkUser as isParentInvoiceUser };
