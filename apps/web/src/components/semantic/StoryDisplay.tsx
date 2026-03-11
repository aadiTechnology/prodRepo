/**
 * StoryDisplay — Semantic component
 * Displays a user story: title, prerequisite, story, acceptance criteria.
 * Uses primitives and tokens.
 */

import { Box } from "../primitives";
import { Typography } from "../primitives";
import ReviewStatusBadge, { type ReviewStatus } from "./ReviewStatusBadge";
import type { UserStoryItem } from "../../api/services/aiService";
import { radiusTokens } from "../../tokens";

export interface StoryDisplayProps {
  story: UserStoryItem;
  /** Optional actions (e.g. Approve / Reject buttons) */
  actions?: React.ReactNode;
}

function normalizeList(value: string[] | null | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [];
}

export default function StoryDisplay({ story, actions }: StoryDisplayProps) {
  const prerequisite = normalizeList(story.prerequisite);
  const acceptanceCriteria = normalizeList(story.acceptance_criteria);
  const status = (story.review_status ?? "draft") as ReviewStatus;

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: radiusTokens.xl,
        bgcolor: "grey.50",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {story.title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ReviewStatusBadge status={status} />
          {actions}
        </Box>
      </Box>
      {prerequisite.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5 }}>
            Prerequisite
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {prerequisite.map((p, i) => (
              <li key={i}>
                <Typography variant="body2">{p}</Typography>
              </li>
            ))}
          </Box>
        </Box>
      )}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5 }}>
          Story
        </Typography>
        <Typography variant="body2">{story.story}</Typography>
      </Box>
      {acceptanceCriteria.length > 0 && (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5 }}>
            Acceptance Criteria
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {acceptanceCriteria.map((c, i) => (
              <li key={i}>
                <Typography variant="body2">{c}</Typography>
              </li>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
