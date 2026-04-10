export interface Student {
  id: string;
  name: string;
  gender?: string;
  mobile?: string;
  class?: string;
  status: "Active" | "Inactive";
}

export interface StudentListResponse {
  data: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface StudentUpdate {
  name?: string;
  gender?: string;
  mobile?: string;
  class?: string;
  status?: "Active" | "Inactive";
}
