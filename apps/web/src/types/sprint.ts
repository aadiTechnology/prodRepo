export type Sprint = {
  sprint_id: number;
  sprint_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean | null;
  is_completed?: boolean | null;
  created_on?: string | null;
  project_id?: number | null;
};

export type OptionItem = { id: number; label: string };

export type SprintAssignedUser = {
  user_id: number;
  user_name?: string | null;
};

export type SprintAssignedUserDetail = SprintAssignedUser & {
  is_primary?: boolean;
};

export type SprintPageAssignment = {
  page_id: number;
  page_name?: string | null;
  assigned_users: SprintAssignedUser[];
  developers?: SprintAssignedUserDetail[];
  testers?: SprintAssignedUserDetail[];
  primary_developer_id?: number | null;
  primary_tester_id?: number | null;
};

export type SprintFeatureAssignment = {
  feature_id: number;
  feature_name?: string | null;
  pages: SprintPageAssignment[];
};

export type SprintPageAssignmentWrite = {
  page_id: number;
  user_ids: number[];
  developer_user_ids?: number[] | null;
  tester_user_ids?: number[] | null;
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
};

export type SprintUpdate = Partial<SprintCreate>;

export type SprintAssignmentOptionsResponse = {
  features: OptionItem[];
  users: OptionItem[];
};

export type SprintAssignmentsWrite = {
  feature_assignments: SprintFeatureAssignmentWrite[];
};

export type SprintAssignmentsResponse = {
  sprint_id: number;
  project_id: number;
  feature_assignments: SprintFeatureAssignment[];
};

export type SprintAssignmentGridPage = {
  page_id: number;
  page_name?: string | null;
  developers: SprintAssignedUserDetail[];
  testers: SprintAssignedUserDetail[];
  assigned_users: SprintAssignedUser[];
  primary_developer_id?: number | null;
  primary_tester_id?: number | null;
  last_updated_on?: string | null;
  last_updated_by_user_id?: number | null;
  last_updated_by_name?: string | null;
  status: string;
};

export type SprintAssignmentGridFeature = {
  feature_id: number;
  feature_name?: string | null;
  pages: SprintAssignmentGridPage[];
};

export type SprintAssignmentGridStats = {
  total_pages: number;
  assigned_pages: number;
  unassigned_pages: number;
};

export type SprintAssignmentManagementGridResponse = {
  sprint_id: number;
  project_id: number;
  sprint_name?: string | null;
  features: SprintAssignmentGridFeature[];
  stats: SprintAssignmentGridStats;
};

export type SprintAssignmentManagementFeatureGridResponse = {
  sprint_id: number;
  project_id: number;
  sprint_name?: string | null;
  feature: SprintAssignmentGridFeature;
  stats: SprintAssignmentGridStats;
};
