/**
 * DevelopmentTasksDisplay — Renders generated development tasks by category.
 * Groups: frontend, backend, database, testing. Each task shows title, description,
 * related_scenario, component, priority, estimated_effort.
 */

import { AppCard, Box, Stack, Typography } from "../primitives";
import type { GenerateDevelopmentTasksResult } from "../../api/services/aiService";

export interface DevelopmentTasksDisplayProps {
  tasks: GenerateDevelopmentTasksResult;
}

const CATEGORY_LABELS: Record<keyof GenerateDevelopmentTasksResult, string> = {
  frontend_tasks: "Frontend",
  backend_tasks: "Backend",
  database_tasks: "Database",
  testing_tasks: "Testing",
};

function TaskCard({
  task_id,
  title,
  description,
  related_scenario,
  component,
  priority,
  estimated_effort,
  depends_on_task_id,
}: {
  task_id: string;
  title: string;
  description: string;
  related_scenario: string;
  component: string;
  priority: string;
  estimated_effort: string;
  depends_on_task_id?: string | null;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "action.hover",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
          {task_id}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {description}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          fontSize: "0.75rem",
          color: "text.secondary",
        }}
      >
        {depends_on_task_id != null && depends_on_task_id !== "" && (
          <span>
            <strong>Depends on:</strong>{" "}
            <Box component="span" sx={{ fontFamily: "monospace" }}>
              {depends_on_task_id}
            </Box>
          </span>
        )}
        <span>
          <strong>Scenario:</strong>{" "}
          <Box component="span" sx={{ fontFamily: "monospace" }}>
            {related_scenario}
          </Box>
        </span>
        <span>
          <strong>Component:</strong> {component}
        </span>
        <span>
          <strong>Priority:</strong> {priority}
        </span>
        <span>
          <strong>Effort:</strong> {estimated_effort}
        </span>
      </Box>
    </Box>
  );
}

export default function DevelopmentTasksDisplay({ tasks }: DevelopmentTasksDisplayProps) {
  const categories = (
    ["frontend_tasks", "backend_tasks", "database_tasks", "testing_tasks"] as const
  ).filter((key) => tasks[key]?.length > 0);

  if (categories.length === 0) {
    return (
      <AppCard sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No development tasks generated.
        </Typography>
      </AppCard>
    );
  }

  return (
    <AppCard sx={{ mt: 2 }}>
      <Stack spacing={3}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Development Tasks
        </Typography>
        {categories.map((key) => (
          <Box key={key}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, mb: 1, color: "primary.main" }}
            >
              {CATEGORY_LABELS[key]}
            </Typography>
            <Stack spacing={1}>
              {tasks[key].map((task, i) => (
                <TaskCard
                  key={`${key}-${i}-${task.task_id || task.title}`}
                  task_id={task.task_id ?? ""}
                  title={task.title}
                  description={task.description}
                  related_scenario={task.related_scenario}
                  component={task.component}
                  priority={task.priority}
                  estimated_effort={task.estimated_effort}
                  depends_on_task_id={task.depends_on_task_id}
                />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </AppCard>
  );
}
