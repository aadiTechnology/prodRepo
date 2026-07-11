import apiClient from "../client";

export async function clearAiChatSession(): Promise<void> {
  try {
    await apiClient.delete("/api/ai/chat");
  } catch {
    // Non-blocking: logout/login should proceed even if chat clear fails
  }
}
