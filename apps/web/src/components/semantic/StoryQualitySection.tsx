/**
 * StoryQualitySection — Semantic component
 * Displays story quality validation: score, checks, extracted scenarios, suggestions.
 * Shows actions when issues exist: Improve with AI, Edit manually, Continue anyway.
 */

import { Alert } from "@mui/material";
import {
  AppCard,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "../primitives";
import type { StoryQualityValidationResult } from "../../api/services/aiService";

export interface StoryQualitySectionProps {
  validation: StoryQualityValidationResult | null;
  loading?: boolean;
  hasIssues?: boolean;
  onImproveWithAI?: () => void;
  onEditManually?: () => void;
  onContinueAnyway?: () => void;
  improving?: boolean;
}

const CHECK_LABELS: Record<string, string> = {
  story_structure: "Story structure",
  acceptance_criteria_coverage: "Acceptance criteria",
  scenario_coverage: "Scenario coverage",
  ambiguity_detection: "Ambiguity",
};

export default function StoryQualitySection({
  validation,
  loading = false,
  hasIssues = false,
  onImproveWithAI,
  onEditManually,
  onContinueAnyway,
  improving = false,
}: StoryQualitySectionProps) {
  if (loading) {
    return (
      <AppCard sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 1 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Validating story quality…
          </Typography>
        </Box>
      </AppCard>
    );
  }

  if (validation == null) {
    return null;
  }

  const { quality_score, validation_checks, extracted_scenarios, improvement_suggestions } =
    validation;

  return (
    <AppCard sx={{ mt: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Story Quality
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary">
            Quality score:
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color:
                quality_score >= 80
                  ? "success.main"
                  : quality_score >= 50
                    ? "warning.main"
                    : "error.main",
            }}
          >
            {quality_score}%
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Validation checks
          </Typography>
          <Stack spacing={0.5}>
            {validation_checks.map((check) => (
              <Box
                key={check.name}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                  color: check.passed ? "text.secondary" : "error.main",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 140 }}>
                  {CHECK_LABELS[check.name] ?? check.name}:
                </Typography>
                <Typography variant="body2">{check.message}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {extracted_scenarios.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Extracted scenarios
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {extracted_scenarios.map((s) => (
                <Typography
                  key={s}
                  variant="body2"
                  component="span"
                  sx={{
                    px: 1,
                    py: 0.25,
                    bgcolor: "action.selected",
                    borderRadius: 1,
                    fontFamily: "monospace",
                  }}
                >
                  {s}
                </Typography>
              ))}
            </Box>
          </Box>
        )}

        {improvement_suggestions.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Suggestions
            </Typography>
            <Alert severity="info" sx={{ py: 0 }}>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {improvement_suggestions.map((s, i) => (
                  <li key={i}>
                    <Typography variant="body2">{s}</Typography>
                  </li>
                ))}
              </Box>
            </Alert>
          </Box>
        )}

        {hasIssues && (onImproveWithAI || onEditManually || onContinueAnyway) && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", pt: 1 }}>
            {onImproveWithAI && (
              <Button
                variant="contained"
                onClick={onImproveWithAI}
                disabled={improving}
              >
                {improving ? "Improving…" : "Improve with AI"}
              </Button>
            )}
            {onEditManually && (
              <Button variant="outlined" onClick={onEditManually} disabled={improving}>
                Edit manually
              </Button>
            )}
            {onContinueAnyway && (
              <Button variant="text" onClick={onContinueAnyway} disabled={improving}>
                Continue anyway
              </Button>
            )}
          </Box>
        )}
      </Stack>
    </AppCard>
  );
}
