/**
 * useListData — Shared data hook (Phase 7.5)
 * Standardizes list fetch pattern: data, loading, error, refetch.
 * Used by list pages (TenantList, RoleManagementPage, Users).
 * No business logic; caller provides fetcher.
 */

import { useState, useCallback, useEffect, DependencyList } from "react";

export interface UseListDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: (value: T[] | ((prev: T[]) => T[])) => void;
}

/**
 * @param fetcher - Function that returns a promise of the list data.
 * @param deps - Dependency array for when to re-run fetch (e.g. [search, page, rowsPerPage]).
 * @returns { data, loading, error, refetch, setData }
 */
export function useListData<T>(
  fetcher: () => Promise<T[]>,
  deps: DependencyList = []
): UseListDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to load data.";
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    refetch();
  }, deps);

  return { data, loading, error, refetch, setData };
}
