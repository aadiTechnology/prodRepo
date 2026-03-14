import { Alert } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout";
import {
  AppCard,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "../components/primitives";
import { ListPageLayout } from "../components/reusable";
import {
  ApproveButton,
  ArtifactRejectDialog,
  CancelButton,
  RejectButton,
  SaveButton,
  StoryQualitySection,
  TestCaseTable,
  UserStoryDetail,
} from "../components/semantic";
import { useAIReview, type ReviewStoryRecord } from "../features/aiReview";
import aiService from "../api/services/aiService";
import type { StoryQualityValidationResult, TestCaseItem } from "../api/services/aiService";

function normalizeList(value: string[] | string | null | undefined): string[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function listToEditorValue(value: string[] | string | null | undefined): string {
  return normalizeList(value).join("\n");
}

function editorValueToList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function createStoryForm(record: ReviewStoryRecord) {
  return {
    title: record.story.title,
    prerequisite: listToEditorValue(record.story.prerequisite),
    story: record.story.story,
    acceptanceCriteria: listToEditorValue(record.story.acceptance_criteria),
  };
}

function createTestCaseForm(testCase: TestCaseItem) {
  return {
    test_case_id: testCase.test_case_id,
    scenario: testCase.scenario,
    pre_requisite: listToEditorValue(testCase.pre_requisite),
    test_data: listToEditorValue(testCase.test_data),
    steps: listToEditorValue(testCase.steps),
    expected_result: testCase.expected_result,
  };
}

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
    updateStory,
    regenerateStory,
    improveStoryFromQuality,
    approveTestCase,
    rejectTestCase,
    updateTestCase,
    regenerateTestCase,
    approvingStoryId,
    rejectingStoryId,
    approvingTestCaseId,
    rejectingTestCaseId,
    savingStoryId,
    regeneratingStoryId,
    savingTestCaseId,
    regeneratingTestCaseId,
  } = useAIReview();

  const record = useMemo(
    () => (Number.isNaN(parsedStoryId) ? null : getStoryRecord(parsedStoryId)),
    [getStoryRecord, parsedStoryId]
  );

  const [storyEditOpen, setStoryEditOpen] = useState(false);
  const [storyFeedbackOpen, setStoryFeedbackOpen] = useState(false);
  const [storyFeedback, setStoryFeedback] = useState("");
  const [storyForm, setStoryForm] = useState(() =>
    record == null
      ? { title: "", prerequisite: "", story: "", acceptanceCriteria: "" }
      : createStoryForm(record)
  );
  const [editingTestCaseId, setEditingTestCaseId] = useState<number | null>(null);
  const [testCaseFeedbackId, setTestCaseFeedbackId] = useState<number | null>(null);
  const [testCaseFeedback, setTestCaseFeedback] = useState("");
  const [testCaseForm, setTestCaseForm] = useState(() => ({
    test_case_id: "",
    scenario: "",
    pre_requisite: "",
    test_data: "",
    steps: "",
    expected_result: "",
  }));
  const [rejectDialogState, setRejectDialogState] = useState<
    | { type: "story" }
    | { type: "testCase"; id: number }
    | null
  >(null);
  const [qualityValidation, setQualityValidation] =
    useState<StoryQualityValidationResult | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityDismissed, setQualityDismissed] = useState(false);
  const [improvementAppliedMessage, setImprovementAppliedMessage] = useState<string | null>(null);
  const prevStoryIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (record?.story?.id !== prevStoryIdRef.current) {
      prevStoryIdRef.current = record?.story?.id ?? null;
      setQualityValidation(null);
      setQualityDismissed(false);
      setImprovementAppliedMessage(null);
    }
  }, [record?.story?.id]);

  useEffect(() => {
    if (record != null) {
      setStoryForm(createStoryForm(record));
      if (editingTestCaseId != null) {
        const currentTestCase = record.testCases.find((item) => item.id === editingTestCaseId);
        if (currentTestCase == null) {
          setEditingTestCaseId(null);
        } else {
          setTestCaseForm(createTestCaseForm(currentTestCase));
        }
      }
      if (
        testCaseFeedbackId != null &&
        !record.testCases.some((item) => item.id === testCaseFeedbackId)
      ) {
        setTestCaseFeedbackId(null);
      }
    }
  }, [editingTestCaseId, record, testCaseFeedbackId]);

  const storyIsApproved = record?.story.review_status === "approved";
  useEffect(() => {
    if (!record?.story?.id || !storyIsApproved) return;
    let cancelled = false;
    setQualityLoading(true);
    aiService
      .getStoryQualityValidation(record.story.id)
      .then((result) => {
        if (!cancelled) setQualityValidation(result);
      })
      .finally(() => {
        if (!cancelled) setQualityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [record?.story?.id, storyIsApproved]);

  const qualityHasIssues =
    qualityValidation &&
    (qualityValidation.quality_score < 100 ||
      qualityValidation.improvement_suggestions.length > 0);

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
  const storyIsRejected = record.story.review_status === "rejected";
  const editingTestCase =
    editingTestCaseId == null
      ? null
      : record.testCases.find((testCase) => testCase.id === editingTestCaseId) ?? null;
  const feedbackTestCase =
    testCaseFeedbackId == null
      ? null
      : record.testCases.find((testCase) => testCase.id === testCaseFeedbackId) ?? null;

  const handleStoryEditSave = async () => {
    const success = await updateStory(record.story.id, {
      title: storyForm.title.trim(),
      prerequisite: editorValueToList(storyForm.prerequisite),
      story: storyForm.story.trim(),
      acceptance_criteria: editorValueToList(storyForm.acceptanceCriteria),
    });
    if (success) {
      setStoryEditOpen(false);
    }
  };

  const handleStoryRegenerate = async () => {
    const success = await regenerateStory(record.story.id, storyFeedback.trim());
    if (success) {
      setStoryFeedback("");
      setStoryFeedbackOpen(false);
    }
  };

  const handleTestCaseEditSave = async () => {
    if (editingTestCase == null) {
      return;
    }
    const success = await updateTestCase(editingTestCase.id, {
      test_case_id: testCaseForm.test_case_id.trim(),
      scenario: testCaseForm.scenario.trim(),
      pre_requisite: editorValueToList(testCaseForm.pre_requisite),
      test_data: (() => {
        const values = editorValueToList(testCaseForm.test_data);
        return values.length > 0 ? values : null;
      })(),
      steps: editorValueToList(testCaseForm.steps),
      expected_result: testCaseForm.expected_result.trim(),
    });
    if (success) {
      setEditingTestCaseId(null);
    }
  };

  const handleTestCaseRegenerate = async () => {
    if (feedbackTestCase == null) {
      return;
    }
    const success = await regenerateTestCase(feedbackTestCase.id, testCaseFeedback.trim());
    if (success) {
      setTestCaseFeedback("");
      setTestCaseFeedbackId(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (rejectDialogState == null) {
      return;
    }
    if (rejectDialogState.type === "story") {
      const success = await rejectStory(record.story.id, reason);
      if (success) {
        setRejectDialogState(null);
      }
    } else {
      const success = await rejectTestCase(rejectDialogState.id, reason);
      if (success) {
        setRejectDialogState(null);
      }
    }
  };

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
        rejectionReason={record.story.rejection_reason}
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
                onClick={() => setRejectDialogState({ type: "story" })}
                disabled={
                  approvingStoryId === record.story.id ||
                  rejectingStoryId === record.story.id
                }
              />
            </Box>
          ) : storyIsRejected ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setStoryForm(createStoryForm(record));
                  setStoryFeedbackOpen(false);
                  setStoryEditOpen(true);
                }}
                disabled={
                  savingStoryId === record.story.id ||
                  regeneratingStoryId === record.story.id
                }
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => {
                  setStoryEditOpen(false);
                  setStoryFeedbackOpen(true);
                }}
                disabled={
                  savingStoryId === record.story.id ||
                  regeneratingStoryId === record.story.id
                }
              >
                Regenerate
              </Button>
            </Box>
          ) : null
        }
      />

      {(qualityValidation != null || qualityLoading) && (
        <>
          {improvementAppliedMessage && (
            <Alert severity="success" sx={{ mt: 2 }} onClose={() => setImprovementAppliedMessage(null)}>
              {improvementAppliedMessage}
            </Alert>
          )}
          <StoryQualitySection
          validation={qualityValidation}
          loading={qualityLoading}
          hasIssues={!!qualityHasIssues && !qualityDismissed}
          onImproveWithAI={
            qualityHasIssues
              ? async () => {
                  const result = await improveStoryFromQuality(record.story.id);
                  if (result?.validation) {
                    setQualityValidation(result.validation);
                    setImprovementAppliedMessage(
                      "AI improvements applied. Quality score updated."
                    );
                  }
                }
              : undefined
          }
          onEditManually={() => setStoryEditOpen(true)}
          onContinueAnyway={() => setQualityDismissed(true)}
          improving={regeneratingStoryId === record.story.id}
        />
        </>
      )}

      {storyEditOpen ? (
        <AppCard sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {storyIsRejected ? "Edit User Story" : "Edit User Story (manual)"}
            </Typography>
            <TextField
              label="Title"
              fullWidth
              value={storyForm.title}
              onChange={(event) =>
                setStoryForm((current) => ({ ...current, title: event.target.value }))
              }
            />
            <TextField
              label="Prerequisite"
              fullWidth
              multiline
              minRows={3}
              helperText="One item per line"
              value={storyForm.prerequisite}
              onChange={(event) =>
                setStoryForm((current) => ({
                  ...current,
                  prerequisite: event.target.value,
                }))
              }
            />
            <TextField
              label="Story"
              fullWidth
              multiline
              minRows={4}
              value={storyForm.story}
              onChange={(event) =>
                setStoryForm((current) => ({ ...current, story: event.target.value }))
              }
            />
            <TextField
              label="Acceptance Criteria"
              fullWidth
              multiline
              minRows={4}
              helperText="One item per line"
              value={storyForm.acceptanceCriteria}
              onChange={(event) =>
                setStoryForm((current) => ({
                  ...current,
                  acceptanceCriteria: event.target.value,
                }))
              }
            />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <SaveButton
                loading={savingStoryId === record.story.id}
                onClick={() => void handleStoryEditSave()}
                disabled={
                  storyForm.title.trim().length === 0 || storyForm.story.trim().length === 0
                }
              />
              <CancelButton onClick={() => setStoryEditOpen(false)} />
            </Box>
          </Stack>
        </AppCard>
      ) : null}

      {storyIsRejected && storyFeedbackOpen ? (
        <AppCard sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Regenerate User Story
            </Typography>
            {record.story.rejection_reason ? (
              <Alert severity="warning">
                Regeneration should address: {record.story.rejection_reason}
              </Alert>
            ) : null}
            <TextField
              label="Feedback for AI"
              fullWidth
              multiline
              minRows={4}
              value={storyFeedback}
              onChange={(event) => setStoryFeedback(event.target.value)}
            />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <SaveButton
                loading={regeneratingStoryId === record.story.id}
                onClick={() => void handleStoryRegenerate()}
                disabled={storyFeedback.trim().length === 0}
              >
                Regenerate
              </SaveButton>
              <CancelButton onClick={() => setStoryFeedbackOpen(false)} />
            </Box>
          </Stack>
        </AppCard>
      ) : null}

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
          onReject={(testCaseId) => setRejectDialogState({ type: "testCase", id: testCaseId })}
          onEdit={(testCaseId) => {
            const testCase = record.testCases.find((item) => item.id === testCaseId);
            if (testCase == null) {
              return;
            }
            setTestCaseFeedbackId(null);
            setTestCaseForm(createTestCaseForm(testCase));
            setEditingTestCaseId(testCaseId);
          }}
          onRegenerate={(testCaseId) => {
            setEditingTestCaseId(null);
            setTestCaseFeedback("");
            setTestCaseFeedbackId(testCaseId);
          }}
          approvingId={approvingTestCaseId}
          rejectingId={rejectingTestCaseId}
          savingId={savingTestCaseId}
          regeneratingId={regeneratingTestCaseId}
        />
      </Box>

      {editingTestCase != null ? (
        <AppCard sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Edit Test Case
            </Typography>
            {editingTestCase.rejection_reason ? (
              <Alert severity="error">
                <strong>Rejection reason:</strong> {editingTestCase.rejection_reason}
              </Alert>
            ) : null}
            <TextField
              label="Test Case ID"
              fullWidth
              value={testCaseForm.test_case_id}
              onChange={(event) =>
                setTestCaseForm((current) => ({
                  ...current,
                  test_case_id: event.target.value,
                }))
              }
            />
            <TextField
              label="Scenario"
              fullWidth
              multiline
              minRows={2}
              value={testCaseForm.scenario}
              onChange={(event) =>
                setTestCaseForm((current) => ({ ...current, scenario: event.target.value }))
              }
            />
            <TextField
              label="Pre-requisite"
              fullWidth
              multiline
              minRows={3}
              helperText="One item per line"
              value={testCaseForm.pre_requisite}
              onChange={(event) =>
                setTestCaseForm((current) => ({
                  ...current,
                  pre_requisite: event.target.value,
                }))
              }
            />
            <TextField
              label="Test Data"
              fullWidth
              multiline
              minRows={3}
              helperText="One item per line"
              value={testCaseForm.test_data}
              onChange={(event) =>
                setTestCaseForm((current) => ({
                  ...current,
                  test_data: event.target.value,
                }))
              }
            />
            <TextField
              label="Steps"
              fullWidth
              multiline
              minRows={4}
              helperText="One item per line"
              value={testCaseForm.steps}
              onChange={(event) =>
                setTestCaseForm((current) => ({ ...current, steps: event.target.value }))
              }
            />
            <TextField
              label="Expected Result"
              fullWidth
              multiline
              minRows={3}
              value={testCaseForm.expected_result}
              onChange={(event) =>
                setTestCaseForm((current) => ({
                  ...current,
                  expected_result: event.target.value,
                }))
              }
            />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <SaveButton
                loading={savingTestCaseId === editingTestCase.id}
                onClick={() => void handleTestCaseEditSave()}
                disabled={
                  testCaseForm.test_case_id.trim().length === 0 ||
                  testCaseForm.scenario.trim().length === 0 ||
                  testCaseForm.expected_result.trim().length === 0
                }
              />
              <CancelButton onClick={() => setEditingTestCaseId(null)} />
            </Box>
          </Stack>
        </AppCard>
      ) : null}

      {feedbackTestCase != null ? (
        <AppCard sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Regenerate Test Case
            </Typography>
            {feedbackTestCase.rejection_reason ? (
              <Alert severity="warning">
                Regeneration should address: {feedbackTestCase.rejection_reason}
              </Alert>
            ) : null}
            <TextField
              label="Feedback for AI"
              fullWidth
              multiline
              minRows={4}
              value={testCaseFeedback}
              onChange={(event) => setTestCaseFeedback(event.target.value)}
            />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <SaveButton
                loading={regeneratingTestCaseId === feedbackTestCase.id}
                onClick={() => void handleTestCaseRegenerate()}
                disabled={testCaseFeedback.trim().length === 0}
              >
                Regenerate
              </SaveButton>
              <CancelButton onClick={() => setTestCaseFeedbackId(null)} />
            </Box>
          </Stack>
        </AppCard>
      ) : null}

      <ArtifactRejectDialog
        open={rejectDialogState != null}
        title={
          rejectDialogState?.type === "story"
            ? "Reject user story"
            : "Reject test case"
        }
        loading={
          rejectDialogState?.type === "story"
            ? rejectingStoryId === record.story.id
            : rejectDialogState?.type === "testCase"
              ? rejectingTestCaseId === rejectDialogState.id
              : false
        }
        onClose={() => setRejectDialogState(null)}
        onConfirm={(reason) => void handleRejectConfirm(reason)}
      />
    </ListPageLayout>
  );
}
