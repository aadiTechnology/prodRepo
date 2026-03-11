import { Alert } from "@mui/material";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout";
import { Box, Button, CircularProgress, Typography } from "../components/primitives";
import { ListPageLayout } from "../components/reusable";
import {
  ApproveButton,
  RejectButton,
  TestCaseTable,
  UserStoryDetail,
} from "../components/semantic";
import { useAIReview } from "../features/aiReview";

export default function ArtifactReviewDetailPage() {
  const navigate = useNavigate();
  const { storyId } = useParams<{ storyId: string }>();
  const parsedStoryId = Number(storyId);
  const {
    error,
    loading,
    clearError,
    getStoryRecord,
    approveStory,
    rejectStory,
    approveTestCase,
    rejectTestCase,
    approvingStoryId,
    rejectingStoryId,
    approvingTestCaseId,
    rejectingTestCaseId,
  } = useAIReview();

  const record = useMemo(
    () => (Number.isNaN(parsedStoryId) ? null : getStoryRecord(parsedStoryId)),
    [getStoryRecord, parsedStoryId]
  );

  if (loading) {
    return (
      <ListPageLayout
        header={
          <PageHeader
            title="User Story Review"
            onBack={() => navigate("/ai/review")}
          />
        }
        contentPaddingSize="normal"
      >
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </ListPageLayout>
    );
  }

  if (record == null) {
    return (
      <ListPageLayout
        header={
          <PageHeader
            title="User Story Review"
            onBack={() => navigate("/ai/review")}
          />
        }
        contentPaddingSize="normal"
      >
        <Alert severity="warning">User story was not found in the current review list.</Alert>
      </ListPageLayout>
    );
  }

  const storyIsDraft = record.story.review_status === "draft";

  return (
    <ListPageLayout
      header={
        <PageHeader
          title="User Story Review"
          subtitle={record.requirement.title}
          onBack={() => navigate("/ai/review")}
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

      <UserStoryDetail
        record={record}
        actions={
          storyIsDraft ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <ApproveButton
                onClick={() => void approveStory(record.story.id)}
                disabled={
                  approvingStoryId === record.story.id ||
                  rejectingStoryId === record.story.id
                }
              />
              <RejectButton
                onClick={() => void rejectStory(record.story.id)}
                disabled={
                  approvingStoryId === record.story.id ||
                  rejectingStoryId === record.story.id
                }
              />
            </Box>
          ) : null
        }
      />

      <Box sx={{ mt: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Test Cases
          </Typography>
          <Button variant="text" onClick={() => navigate("/ai/review")}>
            Back to Stories
          </Button>
        </Box>
        <TestCaseTable
          testCases={record.testCases}
          onApprove={(testCaseId) => void approveTestCase(testCaseId)}
          onReject={(testCaseId) => void rejectTestCase(testCaseId)}
          approvingId={approvingTestCaseId}
          rejectingId={rejectingTestCaseId}
        />
      </Box>
    </ListPageLayout>
  );
}
