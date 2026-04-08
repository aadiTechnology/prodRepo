export type Sprint = {
  sprint_id: number;
  sprint_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean | null;
  is_completed?: boolean | null;
  created_on?: string | null;
  project_id?: number | null;
  feature_assignments?: SprintFeatureAssignment[] | null;
};

export type OptionItem = { id: number; label: string };

export type SprintAssignedUser = {
  user_id: number;
  user_name?: string | null;
};

export type SprintPageAssignment = {
  page_id: number;
  page_name?: string | null;
  assigned_users: SprintAssignedUser[];
};

export type SprintFeatureAssignment = {
  feature_id: number;
  feature_name?: string | null;
  pages: SprintPageAssignment[];
};

export type SprintPageAssignmentWrite = {
  page_id: number;
  user_ids: number[];
};

export type SprintFeatureAssignmentWrite = {
  feature_id: number;
  pages: SprintPageAssignmentWrite[];
};

export type SprintCreate = {
  sprint_name: string;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean | null;
  is_completed?: boolean | null;
  feature_assignments?: SprintFeatureAssignmentWrite[];
};

export type SprintUpdate = Partial<SprintCreate>;

export type SprintAssignmentOptionsResponse = {
  features: OptionItem[];
  users: OptionItem[];
};

