import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import aiService, {
  type ArtifactGroup,
  type RequirementItem,
  type ReviewStatus,
  type TestCaseItem,
  type UpdateTestCasePayload,
  type UpdateUserStoryPayload,
  type UserStoryItem,
} from "../../api/services/aiService";

export interface ReviewStoryRecord {
  requirement: RequirementItem;
  story: UserStoryItem;
  testCases: TestCaseItem[];
}

interface AIReviewContextValue {
  items: ArtifactGroup[];
  stories: ReviewStoryRecord[];
  loading: boolean;
  error: string | null;
  approvingStoryId: number | null;
  rejectingStoryId: number | null;
  approvingTestCaseId: number | null;
  rejectingTestCaseId: number | null;
  savingStoryId: number | null;
  regeneratingStoryId: number | null;
  savingTestCaseId: number | null;
  regeneratingTestCaseId: number | null;
  refresh: () => Promise<void>;
  getStoryRecord: (storyId: number) => ReviewStoryRecord | null;
  approveStory: (storyId: number) => Promise<void>;
  rejectStory: (storyId: number, reason: string) => Promise<boolean>;
  updateStory: (storyId: number, payload: UpdateUserStoryPayload) => Promise<boolean>;
  regenerateStory: (storyId: number, feedback: string) => Promise<boolean>;
  approveTestCase: (testCaseId: number) => Promise<void>;
  rejectTestCase: (testCaseId: number, reason: string) => Promise<boolean>;
  updateTestCase: (testCaseId: number, payload: UpdateTestCasePayload) => Promise<boolean>;
  regenerateTestCase: (testCaseId: number, feedback: string) => Promise<boolean>;
  clearError: () => void;
}

const AIReviewContext = createContext<AIReviewContextValue | null>(null);

function sortByCreatedAtDesc<T extends { created_at: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function updateStoryStatus(
  groups: ArtifactGroup[],
  storyId: number,
  reviewStatus: ReviewStatus,
  rejectionReason: string | null = null
): ArtifactGroup[] {
  return groups.map((group) => ({
    ...group,
    user_stories: group.user_stories.map((story) =>
      story.id === storyId
        ? { ...story, review_status: reviewStatus, rejection_reason: rejectionReason }
        : story
    ),
  }));
}

function updateTestCaseStatus(
  groups: ArtifactGroup[],
  testCaseId: number,
  reviewStatus: ReviewStatus,
  rejectionReason: string | null = null
): ArtifactGroup[] {
  return groups.map((group) => ({
    ...group,
    test_cases: group.test_cases.map((testCase) =>
      testCase.id === testCaseId
        ? { ...testCase, review_status: reviewStatus, rejection_reason: rejectionReason }
        : testCase
    ),
  }));
}

function replaceStory(
  groups: ArtifactGroup[],
  updatedStory: UserStoryItem
): ArtifactGroup[] {
  return groups.map((group) => ({
    ...group,
    user_stories: group.user_stories.map((story) =>
      story.id === updatedStory.id ? updatedStory : story
    ),
  }));
}

function replaceTestCase(
  groups: ArtifactGroup[],
  updatedTestCase: TestCaseItem
): ArtifactGroup[] {
  return groups.map((group) => ({
    ...group,
    test_cases: group.test_cases.map((testCase) =>
      testCase.id === updatedTestCase.id ? updatedTestCase : testCase
    ),
  }));
}

export function AIReviewProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ArtifactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingStoryId, setApprovingStoryId] = useState<number | null>(null);
  const [rejectingStoryId, setRejectingStoryId] = useState<number | null>(null);
  const [approvingTestCaseId, setApprovingTestCaseId] = useState<number | null>(null);
  const [rejectingTestCaseId, setRejectingTestCaseId] = useState<number | null>(null);
  const [savingStoryId, setSavingStoryId] = useState<number | null>(null);
  const [regeneratingStoryId, setRegeneratingStoryId] = useState<number | null>(null);
  const [savingTestCaseId, setSavingTestCaseId] = useState<number | null>(null);
  const [regeneratingTestCaseId, setRegeneratingTestCaseId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await aiService.getDrafts();
      setItems(response.items);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? err?.message ?? "Failed to load AI review items."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stories = useMemo(
    () =>
      sortByCreatedAtDesc(
        items.flatMap((group) =>
          group.user_stories
            .map((story) => ({
              requirement: group.requirement,
              story,
              testCases: group.test_cases.filter(
                (testCase) => testCase.user_story_id === story.id
              ),
            }))
            .filter(
              (record) =>
                record.story.review_status !== "approved" ||
                record.testCases.some((testCase) => testCase.review_status !== "approved")
            )
        )
      ),
    [items]
  );

  const getStoryRecord = useCallback(
    (storyId: number) =>
      stories.find((record) => record.story.id === storyId) ?? null,
    [stories]
  );

  const approveStory = useCallback(async (storyId: number) => {
    try {
      setApprovingStoryId(storyId);
      setError(null);
      await aiService.approveUserStory(storyId);
      setItems((current) => updateStoryStatus(current, storyId, "approved"));
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? err?.message ?? "Failed to approve user story."
      );
    } finally {
      setApprovingStoryId(null);
    }
  }, []);

  const rejectStory = useCallback(async (storyId: number, reason: string) => {
    try {
      setRejectingStoryId(storyId);
      setError(null);
      const result = await aiService.rejectUserStory(storyId, { reason });
      setItems((current) =>
        updateStoryStatus(current, storyId, "rejected", result.rejection_reason ?? reason)
      );
      return true;
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? err?.message ?? "Failed to reject user story."
      );
      return false;
    } finally {
      setRejectingStoryId(null);
    }
  }, []);

  const updateStory = useCallback(
    async (storyId: number, payload: UpdateUserStoryPayload) => {
      try {
        setSavingStoryId(storyId);
        setError(null);
        const updated = await aiService.updateUserStory(storyId, payload);
        setItems((current) => replaceStory(current, updated));
        return true;
      } catch (err: any) {
        setError(
          err?.response?.data?.detail ?? err?.message ?? "Failed to update user story."
        );
        return false;
      } finally {
        setSavingStoryId(null);
      }
    },
    []
  );

  const regenerateStory = useCallback(async (storyId: number, feedback: string) => {
    try {
      setRegeneratingStoryId(storyId);
      setError(null);
      const updated = await aiService.regenerateUserStory(storyId, { feedback });
      setItems((current) => replaceStory(current, updated));
      return true;
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? err?.message ?? "Failed to regenerate user story."
      );
      return false;
    } finally {
      setRegeneratingStoryId(null);
    }
  }, []);

  const approveTestCase = useCallback(async (testCaseId: number) => {
    try {
      setApprovingTestCaseId(testCaseId);
      setError(null);
      await aiService.approveTestCase(testCaseId);
      setItems((current) => updateTestCaseStatus(current, testCaseId, "approved"));
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? err?.message ?? "Failed to approve test case."
      );
    } finally {
      setApprovingTestCaseId(null);
    }
  }, []);

  const rejectTestCase = useCallback(async (testCaseId: number, reason: string) => {
    try {
      setRejectingTestCaseId(testCaseId);
      setError(null);
      const result = await aiService.rejectTestCase(testCaseId, { reason });
      setItems((current) =>
        updateTestCaseStatus(
          current,
          testCaseId,
          "rejected",
          result.rejection_reason ?? reason
        )
      );
      return true;
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? err?.message ?? "Failed to reject test case."
      );
      return false;
    } finally {
      setRejectingTestCaseId(null);
    }
  }, []);

  const updateTestCase = useCallback(
    async (testCaseId: number, payload: UpdateTestCasePayload) => {
      try {
        setSavingTestCaseId(testCaseId);
        setError(null);
        const updated = await aiService.updateTestCase(testCaseId, payload);
        setItems((current) => replaceTestCase(current, updated));
        return true;
      } catch (err: any) {
        setError(
          err?.response?.data?.detail ?? err?.message ?? "Failed to update test case."
        );
        return false;
      } finally {
        setSavingTestCaseId(null);
      }
    },
    []
  );

  const regenerateTestCase = useCallback(async (testCaseId: number, feedback: string) => {
    try {
      setRegeneratingTestCaseId(testCaseId);
      setError(null);
      const updated = await aiService.regenerateTestCase(testCaseId, { feedback });
      setItems((current) => replaceTestCase(current, updated));
      return true;
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? err?.message ?? "Failed to regenerate test case."
      );
      return false;
    } finally {
      setRegeneratingTestCaseId(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      items,
      stories,
      loading,
      error,
      approvingStoryId,
      rejectingStoryId,
      approvingTestCaseId,
      rejectingTestCaseId,
      savingStoryId,
      regeneratingStoryId,
      savingTestCaseId,
      regeneratingTestCaseId,
      refresh,
      getStoryRecord,
      approveStory,
      rejectStory,
      updateStory,
      regenerateStory,
      approveTestCase,
      rejectTestCase,
      updateTestCase,
      regenerateTestCase,
      clearError: () => setError(null),
    }),
    [
      approveStory,
      approveTestCase,
      approvingStoryId,
      approvingTestCaseId,
      error,
      getStoryRecord,
      items,
      loading,
      regeneratingStoryId,
      regeneratingTestCaseId,
      refresh,
      rejectStory,
      rejectTestCase,
      rejectingStoryId,
      rejectingTestCaseId,
      savingStoryId,
      savingTestCaseId,
      stories,
      updateStory,
      regenerateStory,
      updateTestCase,
      regenerateTestCase,
    ]
  );

  return (
    <AIReviewContext.Provider value={value}>{children}</AIReviewContext.Provider>
  );
}

export function useAIReview() {
  const context = useContext(AIReviewContext);
  if (context == null) {
    throw new Error("useAIReview must be used within AIReviewProvider.");
  }
  return context;
}
