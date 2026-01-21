/**
 * API Types
 * Type definitions for API requests and responses
 */

import { ApiErrorResponse } from "../api/client";

/**
 * Standard API error interface
 * @deprecated Use ApiErrorResponse from '../api/client' instead
 */
export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

// Re-export for convenience
export type { ApiErrorResponse } from "../api/client";
