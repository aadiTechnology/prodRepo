import apiClient from "../client";
import { User, UserCreate, UserUpdate } from "../../types/user";

/** Matches FastAPI `APIRouter(prefix="/api/account")` in app/routers/user.py */
const ACCOUNT_BASE_URL = "/api/account";

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>(`${ACCOUNT_BASE_URL}/`);
    return response.data;
  },

  getUserById: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`${ACCOUNT_BASE_URL}/${id}`);
    return response.data;
  },

  createUser: async (userData: UserCreate): Promise<User> => {
    const response = await apiClient.post<User>(`${ACCOUNT_BASE_URL}/`, userData);
    return response.data;
  },

  updateUser: async (id: number, userData: UserUpdate): Promise<User> => {
    const response = await apiClient.put<User>(`${ACCOUNT_BASE_URL}/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`${ACCOUNT_BASE_URL}/${id}`);
  },

  changePassword: async (id: number, newPassword: string): Promise<void> => {
    await apiClient.put(`${ACCOUNT_BASE_URL}/${id}/password`, {
      new_password: newPassword,
    });
  },

  changeOwnPassword: async (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>(
      `${ACCOUNT_BASE_URL}/change-password`,
      payload,
    );
    return response.data;
  },
};

export default userService;
