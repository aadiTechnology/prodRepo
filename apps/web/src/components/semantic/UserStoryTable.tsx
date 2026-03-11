/**
 * UserStoryTable — Semantic component
 * Presents AI-generated user stories in a scalable review table.
 */

import { Button, Typography } from "../primitives";
import { DataTable } from "../reusable";
import ReviewStatusBadge from "./ReviewStatusBadge";
import type { ReviewStoryRecord } from "../../features/aiReview";

export interface UserStoryTableProps {
  stories: ReviewStoryRecord[];
  loading?: boolean;
  onViewStory: (storyId: number) => void;
}

function formatCreatedAt(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function UserStoryTable({
  stories,
  loading = false,
  onViewStory,
}: UserStoryTableProps) {
  return (
    <DataTable<ReviewStoryRecord>
      columns={[
        {
          id: "title",
          label: "User Story Title",
          render: ({ story }) => (
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
              {story.title}
            </Typography>
          ),
        },
        {
          id: "status",
          label: "Status",
          render: ({ story }) => (
            <ReviewStatusBadge status={story.review_status ?? "draft"} />
          ),
        },
        {
          id: "created_at",
          label: "Created Date",
          render: ({ story }) => formatCreatedAt(story.created_at),
        },
      ]}
      data={stories}
      loading={loading}
      getRowKey={({ story }) => story.id}
      onRowClick={({ story }) => onViewStory(story.id)}
      renderRowActions={({ story }) => (
        <Button
          size="small"
          variant="outlined"
          onClick={(event) => {
            event.stopPropagation();
            onViewStory(story.id);
          }}
        >
          View
        </Button>
      )}
      emptyMessage="No generated user stories available."
      maxHeight="calc(100vh - 260px)"
    />
  );
}
