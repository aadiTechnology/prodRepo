import { useCallback, useState } from "react";

const STORAGE_KEY = "reports.selectedProjectId";

function readStoredProjectId(): number | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Persists chosen PT_Project.Id for report pages (tenant is not user-selectable). */
export function useReportProjectSelection() {
  const [projectId, setProjectIdState] = useState<number | null>(readStoredProjectId);

  const setProjectId = useCallback((id: number | null) => {
    setProjectIdState(id);
    try {
      if (id == null) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  return { projectId, setProjectId };
}
