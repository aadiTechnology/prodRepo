/**
 * TaskGenerationValidationPanel — Pre-generation workflow validation summary.
 * Shown when story is approved; displays scenarios count, test cases count,
 * coverage %, quality score %, recommendation, and [ Generate Development Tasks ].
 */

import { AppCard, Box, Button, Stack, Typography } from "../primitives";
import type { StoryQualityValidationResult } from "../../api/services/aiService";

export interface TaskGenerationValidationPanelProps {
  /** Quality validation result (scenarios, score, etc.). */
  validation: StoryQualityValidationResult;
  /** Number of test cases for this story. */
  testCasesCount: number;
  /** Callback when user confirms generation. */
  onGenerate: () => void;
  /** Whether generation is in progress. */
  generating?: boolean;
  /** If true, tasks already exist for this story; show View Tasks and disable Generate. */
  tasksExist?: boolean;
  /** Total number of development tasks when tasksExist is true. */
  taskCount?: number;
  /** Callback when user clicks View Tasks (e.g. scroll to tasks section). */
  onViewTasks?: () => void;
}

function getRecommendation(
  qualityScore: number,
  coveragePct: number
): string {
  if (qualityScore >= 80 && coveragePct >= 80) {
    return "Good coverage. Safe to generate development tasks.";
  }
  if (qualityScore >= 50 && coveragePct >= 50) {
    return "Moderate coverage. Consider improving quality or coverage before generating tasks.";
  }
  return "Low coverage or quality. Improve story and test coverage before generating tasks.";
}

function getCoveragePct(validation: StoryQualityValidationResult): number {
  const { normalized_scenarios, missing_test_case_scenarios } = validation;
  if (normalized_scenarios.length === 0) return 100;
  const covered =
    normalized_scenarios.length - missing_test_case_scenarios.length;
  return Math.round((covered / normalized_scenarios.length) * 100);
}

export default function TaskGenerationValidationPanel({
  validation,
  testCasesCount,
  onGenerate,
  generating = false,
  tasksExist = false,
  taskCount = 0,
  onViewTasks,
}: TaskGenerationValidationPanelProps) {
  const coveragePct = getCoveragePct(validation);
  const recommendation = getRecommendation(
    validation.quality_score,
    coveragePct
  );

  return (
    <AppCard sx={{ mt: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Pre-Generation Validation
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {tasksExist ? "Tasks Generated ✓" : "Story Approved ✓"}
          </Typography>
          {tasksExist ? (
            <Typography variant="body2" color="text.secondary">
              Total Tasks: {taskCount}
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Scenarios: {validation.normalized_scenarios.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Test Cases: {testCasesCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Coverage: {coveragePct}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quality Score: {validation.quality_score}%
              </Typography>
            </>
          )}
        </Box>

        {!tasksExist && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Recommendation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {recommendation}
            </Typography>
          </Box>
        )}

        <Box sx={{ pt: 1, display: "flex", gap: 1 }}>
          {tasksExist ? (
            <Button
              variant="contained"
              onClick={onViewTasks}
              disabled={!onViewTasks}
            >
              View Tasks
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={onGenerate}
              disabled={generating}
            >
              {generating ? "Generating…" : "Generate Development Tasks"}
            </Button>
          )}
        </Box>
      </Stack>
    </AppCard>
  );
}
