import { Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/layout";
import { Button, Typography } from "../components/primitives";
import { ListPageLayout } from "../components/reusable";
import { UserStoryTable } from "../components/semantic";
import { useAIReview } from "../features/aiReview";

export default function ArtifactReviewPage() {
  const navigate = useNavigate();
  const { stories, loading, error, refresh, clearError } = useAIReview();

  return (
    <ListPageLayout
      header={
        <PageHeader
          title="AI Review"
          subtitle="Review generated user stories and revise rejected artifacts before approval."
          actions={
            <Button onClick={() => void refresh()} disabled={loading}>
              Refresh
            </Button>
          }
        />
      }
      contentPaddingSize="normal"
      maxWidth={false}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}
      {stories.length === 0 && !loading ? (
        <Typography color="text.secondary">
          No generated user stories available for review.
        </Typography>
      ) : (
        <UserStoryTable
          stories={stories}
          loading={loading}
          onViewStory={(storyId) => navigate(`/ai/review/${storyId}`)}
        />
      )}
    </ListPageLayout>
  );
}
