import apiClient from "../client";
import type {
  FeeReportFilterOptions,
  FeeReportParams,
  FeeReportResponse,
} from "../../types/feeReport";

const feeReportService = {
  getFilterOptions: async (): Promise<FeeReportFilterOptions> => {
    const response = await apiClient.get("/fees/reports/options");
    return response.data;
  },

  getReport: async (params: FeeReportParams): Promise<FeeReportResponse> => {
    const cleanParams: Record<string, unknown> = {};
    if (params.page !== undefined) cleanParams.page = params.page;
    if (params.size !== undefined) cleanParams.size = params.size;
    if (params.academic_year_id) cleanParams.academic_year_id = params.academic_year_id;
    if (params.class_id) cleanParams.class_id = params.class_id;
    if (params.installment) cleanParams.installment = params.installment;
    if (params.start_date) cleanParams.start_date = params.start_date;
    if (params.end_date) cleanParams.end_date = params.end_date;
    if (params.search) cleanParams.search = params.search;

    const response = await apiClient.get("/fees/reports", { params: cleanParams });
    return response.data;
  },
};

export default feeReportService;
