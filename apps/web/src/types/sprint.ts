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

export type SprintCreate = {
  sprint_name: string;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean | null;
  is_completed?: boolean | null;
};

export type SprintUpdate = Partial<SprintCreate>;

