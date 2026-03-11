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
  refresh: () => Promise<void>;
  getStoryRecord: (storyId: number) => ReviewStoryRecord | null;
  approveStory: (storyId: number) => Promise<void>;
  rejectStory: (storyId: number) => Promise<void>;
  approveTestCase: (testCaseId: number) => Promise<void>;
  rejectTestCase: (testCaseId: number) => Promise<void>;
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
  reviewStatus: ReviewStatus
): ArtifactGroup[] {
  return groups.map((group) => ({
    ...group,
    user_stories: group.user_stories.map((story) =>
      story.id === storyId ? { ...story, review_status: reviewStatus } : story
    ),
  }));
}

function updateTestCaseStatus(
  groups: ArtifactGroup[],
  testCaseId: number,
  reviewStatus: ReviewStatus
): ArtifactGroup[] {
  return groups.map((group) => ({
    ...group,
    test_cases: group.test_cases.map((testCase) =>
      testCase.id === testCaseId
        ? { ...testCase, review_status: reviewStatus }
        : testCase
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
          group.user_stories.map((story) => ({
            requirement: group.requirement,
            story,
            testCases: group.test_cases.filter(
              (testCase) => testCase.user_story_id === story.id
            ),
          }))
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

  const rejectStory = useCallback(async (storyId: number) => {
    try {
      setRejectingStoryId(storyId);
      setError(null);
      await aiService.rejectUserStory(storyId);
      setItems((current) => updateStoryStatus(current, storyId, "rejected"));
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? err?.message ?? "Failed to reject user story."
      );
    } finally {
      setRejectingStoryId(null);
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

  const rejectTestCase = useCallback(async (testCaseId: number) => {
    try {
      setRejectingTestCaseId(testCaseId);
      setError(null);
      await aiService.rejectTestCase(testCaseId);
      setItems((current) => updateTestCaseStatus(current, testCaseId, "rejected"));
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? err?.message ?? "Failed to reject test case."
      );
    } finally {
      setRejectingTestCaseId(null);
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
      refresh,
      getStoryRecord,
      approveStory,
      rejectStory,
      approveTestCase,
      rejectTestCase,
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
      refresh,
      rejectStory,
      rejectTestCase,
      rejectingStoryId,
      rejectingTestCaseId,
      stories,
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
