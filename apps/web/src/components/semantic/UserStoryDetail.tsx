/**
 * UserStoryDetail — Semantic component
 * Displays the complete user story review content.
 */

import { AppCard, Box, Stack, Typography } from "../primitives";
import { Alert } from "@mui/material";
import ReviewStatusBadge from "./ReviewStatusBadge";
import type { ReviewStoryRecord } from "../../features/aiReview";

export interface UserStoryDetailProps {
  record: ReviewStoryRecord;
  actions?: React.ReactNode;
  rejectionReason?: string | null;
}

function formatCreatedAt(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function UserStoryDetail({
  record,
  actions,
  rejectionReason,
}: UserStoryDetailProps) {
  const { requirement, story } = record;

  return (
    <AppCard>
      <Stack spacing={3}>
        {story.review_status === "rejected" && rejectionReason ? (
          <Alert severity="error">
            <strong>Rejection reason:</strong> {rejectionReason}
          </Alert>
        ) : null}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {story.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Created {formatCreatedAt(story.created_at)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <ReviewStatusBadge status={story.review_status ?? "draft"} />
            {actions}
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Requirement
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {requirement.description}
          </Typography>
        </Box>

        {story.prerequisite != null && story.prerequisite.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Prerequisite
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {story.prerequisite.map((item, index) => (
                <li key={`${story.id}-prerequisite-${index}`}>
                  <Typography variant="body2">{item}</Typography>
                </li>
              ))}
            </Box>
          </Box>
        )}

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Story
          </Typography>
          <Typography variant="body2">{story.story}</Typography>
        </Box>

        {story.acceptance_criteria != null &&
          story.acceptance_criteria.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Acceptance Criteria
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {story.acceptance_criteria.map((criterion, index) => (
                  <li key={`${story.id}-criterion-${index}`}>
                    <Typography variant="body2">{criterion}</Typography>
                  </li>
                ))}
              </Box>
            </Box>
          )}
      </Stack>
    </AppCard>
  );
}
