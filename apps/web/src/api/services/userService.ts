import axiosInstance from "../axiosInstance";
import { User, UserCreate, UserUpdate, ApiError } from "../../types/user";

export const userService = {
  /**
   * Get all users
   */
  getAllUsers: async (): Promise<User[]> => {
    const response = await axiosInstance.get<User[]>("/users");
    return response.data;
  },

  /**
   * Get a single user by ID
   */
  getUserById: async (id: number): Promise<User> => {
    const response = await axiosInstance.get<User>(`/users/${id}`);
    return response.data;
  },

  /**
   * Create a new user
   */
  createUser: async (userData: UserCreate): Promise<User> => {
    const response = await axiosInstance.post<User>("/users", userData);
    return response.data;
  },

  /**
   * Update an existing user
   */
  updateUser: async (id: number, userData: UserUpdate): Promise<User> => {
    const response = await axiosInstance.put<User>(`/users/${id}`, userData);
    return response.data;
  },

  /**
   * Delete a user
   */
  deleteUser: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/users/${id}`);
  },
};

export default userService;
