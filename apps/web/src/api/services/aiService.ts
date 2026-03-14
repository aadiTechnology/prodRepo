import apiClient from "../client";

export type ReviewStatus = "draft" | "approved" | "rejected";

export interface UserStoryItem {
  id: number;
  requirement_id: number;
  title: string;
  prerequisite: string[] | null;
  story: string;
  acceptance_criteria: string[] | null;
  review_status: ReviewStatus;
  rejection_reason?: string | null;
  tenant_id: number | null;
  is_super_admin_accessible: boolean;
  created_at: string;
  created_by: number | null;
  updated_at: string | null;
  updated_by: number | null;
}

export interface TestCaseItem {
  id: number;
  user_story_id: number;
  test_case_id: string;
  scenario: string;
  pre_requisite: string[] | string | null;
  test_data: string[] | string | null;
  steps: string[] | null;
  expected_result: string;
  review_status: ReviewStatus;
  rejection_reason?: string | null;
  tenant_id: number | null;
  is_super_admin_accessible: boolean;
  created_at: string;
  created_by: number | null;
  updated_at: string | null;
  updated_by: number | null;
}

export interface RequirementItem {
  id: number;
  title: string;
  description: string;
  tenant_id: number | null;
  is_super_admin_accessible: boolean;
  created_at: string;
  created_by: number | null;
  updated_at: string | null;
  updated_by: number | null;
}

export interface ArtifactGroup {
  requirement: RequirementItem;
  user_stories: UserStoryItem[];
  test_cases: TestCaseItem[];
}

export interface GenerateStoryAndTestsResult {
  requirement: RequirementItem;
  user_stories: UserStoryItem[];
  test_cases: TestCaseItem[];
}

export interface RejectArtifactPayload {
  reason: string;
}

export interface UpdateUserStoryPayload {
  title: string;
  prerequisite: string[];
  story: string;
  acceptance_criteria: string[];
}

export interface UpdateTestCasePayload {
  test_case_id: string;
  scenario: string;
  pre_requisite: string[];
  test_data: string[] | null;
  steps: string[];
  expected_result: string;
}

export interface RegenerateArtifactPayload {
  feedback: string;
}

export interface StoryQualityValidationCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface StoryQualityValidationResult {
  quality_score: number;
  validation_checks: StoryQualityValidationCheck[];
  extracted_scenarios: string[];
  improvement_suggestions: string[];
}

export const aiService = {
  generateStoryAndTests: async (
    requirement: string
  ): Promise<GenerateStoryAndTestsResult> => {
    const response = await apiClient.post(
      "/api/ai/generate-story-and-tests",
      { requirement }
    );
    return response.data;
  },

  getDrafts: async (): Promise<{ items: ArtifactGroup[] }> => {
    const response = await apiClient.get("/api/ai/drafts");
    return response.data;
  },

  getStoryQualityValidation: async (
    userStoryId: number
  ): Promise<StoryQualityValidationResult> => {
    const response = await apiClient.get(
      `/api/ai/user-stories/${userStoryId}/quality-validation`
    );
    return response.data;
  },

  approveUserStory: async (userStoryId: number): Promise<{ id: number; review_status: string }> => {
    const response = await apiClient.patch(`/api/ai/user-stories/${userStoryId}/approve`);
    return response.data;
  },

  rejectUserStory: async (
    userStoryId: number,
    payload: RejectArtifactPayload
  ): Promise<{ id: number; review_status: string; rejection_reason?: string | null }> => {
    const response = await apiClient.patch(`/api/ai/user-stories/${userStoryId}/reject`, payload);
    return response.data;
  },

  updateUserStory: async (
    userStoryId: number,
    payload: UpdateUserStoryPayload
  ): Promise<UserStoryItem> => {
    const response = await apiClient.patch(`/api/ai/user-stories/${userStoryId}`, payload);
    return response.data;
  },

  regenerateUserStory: async (
    userStoryId: number,
    payload: RegenerateArtifactPayload
  ): Promise<UserStoryItem> => {
    const response = await apiClient.post(
      `/api/ai/user-stories/${userStoryId}/regenerate`,
      payload
    );
    return response.data;
  },

  approveTestCase: async (testCaseId: number): Promise<{ id: number; review_status: string }> => {
    const response = await apiClient.patch(`/api/ai/test-cases/${testCaseId}/approve`);
    return response.data;
  },

  rejectTestCase: async (
    testCaseId: number,
    payload: RejectArtifactPayload
  ): Promise<{ id: number; review_status: string; rejection_reason?: string | null }> => {
    const response = await apiClient.patch(`/api/ai/test-cases/${testCaseId}/reject`, payload);
    return response.data;
  },

  updateTestCase: async (
    testCaseId: number,
    payload: UpdateTestCasePayload
  ): Promise<TestCaseItem> => {
    const response = await apiClient.patch(`/api/ai/test-cases/${testCaseId}`, payload);
    return response.data;
  },

  regenerateTestCase: async (
    testCaseId: number,
    payload: RegenerateArtifactPayload
  ): Promise<TestCaseItem> => {
    const response = await apiClient.post(
      `/api/ai/test-cases/${testCaseId}/regenerate`,
      payload
    );
    return response.data;
  },
};

export default aiService;
