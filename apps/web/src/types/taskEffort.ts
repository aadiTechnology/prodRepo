export type TaskStatusItem = {
  status_id: number;
  status_name: string;
  sort_order: number;
};

export type TaskEffortRow = {
  timesheet_id: number;
  task_name: string;
  subtask_name: string;
  status_id: number;
  status_label: string;
  total_effort: number | null;
  task_start_date: string | null;
  task_end_date: string | null;
  last_updated: string | null;
  is_closed: boolean;
};

export type TaskEffortListResponse = {
  tasks: TaskEffortRow[];
};

export type EffortMutationResponse = {
  ok: boolean;
  task: TaskEffortRow | null;
};
