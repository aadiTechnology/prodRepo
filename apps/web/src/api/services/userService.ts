import apiClient from "../client";
import { User, UserCreate, UserUpdate, ApiError } from "../../types/user";

export const userService = {
  /**
   * Get all users
   */
  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>("/api/account");
    return response.data;
  },

  /**
   * Get a single user by ID
   */
  getUserById: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/api/account/${id}`);
    return response.data;
  },

  /**
   * Create a new user
   */
  createUser: async (userData: UserCreate): Promise<User> => {
    const response = await apiClient.post<User>("/users", userData);
    return response.data;
  },

  /**
   * Update an existing user
   */
  updateUser: async (id: number, userData: UserUpdate): Promise<User> => {
    const response = await apiClient.put<User>(`/api/account/${id}`, userData);
    return response.data;
  },

  /**
   * Delete a user
   */
  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/account/${id}`);
  },

  /**
   * Change a user's password (admin-only)
   */
  changePassword: async (id: number, newPassword: string): Promise<void> => {
    await apiClient.put(`/users/${id}/password`, {
    new_password: newPassword,
    });
  },
};

export default userService;
