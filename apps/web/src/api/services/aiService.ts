import apiClient from "../client";

export interface GenerateStoryAndTestsResult {
  requirement: {
    id: number;
    title: string;
    description: string;
  };
  user_stories: Array<{
    id: number;
    title: string;
    story: string;
    acceptance_criteria: string[] | null;
  }>;
  test_cases: Array<{
    id: number;
    scenario: string;
    steps: string[] | null;
    expected_result: string;
  }>;
}

export const aiService = {
  /**
   * Generate user stories and test cases from a requirement
   */
  generateStoryAndTests: async (
    requirement: string
  ): Promise<GenerateStoryAndTestsResult> => {
    const response = await apiClient.post(
      "/api/ai/generate-story-and-tests",
      { requirement }
    );
    return response.data;
  },
};

export default aiService;
