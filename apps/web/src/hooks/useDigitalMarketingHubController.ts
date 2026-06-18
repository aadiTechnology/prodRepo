import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import marketingHubService, { MarketingHubConfig } from "../api/services/marketingHubService";
import { MARKETING_CATEGORIES, normalizeIntegrationUrl } from "../pages/marketing/marketingHub.utils";

export type { NewPlatformForm } from "../pages/marketing/marketingHub.utils";

export type DeleteTarget = { platform: MarketingHubConfig };

export function useDigitalMarketingHubController() {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<MarketingHubConfig[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await marketingHubService.getMarketingConfig();
      setPlatformConfig(
        data.map((platform) => ({
          ...platform,
          url: platform.url ? normalizeIntegrationUrl(platform.url) : platform.url,
        }))
      );
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "Failed to load marketing configurations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    setPage(0);
  }, [categoryFilter, statusFilter, search]);

  const requestDelete = useCallback((platform: MarketingHubConfig) => {
    setDeleteTarget({ platform });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { platform } = deleteTarget;
      if (platform.link_id) {
        await marketingHubService.deleteMarketingLink(platform.link_id);
      }
      await marketingHubService.deletePlatform(platform.platform_id);
      setSuccess(`${platform.name} removed from catalog.`);
      setDeleteTarget(null);
      await fetchConfig();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, fetchConfig]);

  const categoryFilterOptions = useMemo(
    () =>
      MARKETING_CATEGORIES.slice(1).map((category) => ({
        label: `${category} (${platformConfig.filter((platform) => platform.category === category).length})`,
        value: category,
      })),
    [platformConfig]
  );

  const statusFilterOptions = useMemo(
    () => [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
      { label: "Configured", value: "configured" },
    ],
    []
  );

  const filteredPlatforms = useMemo(() => {
    const query = search.trim().toLowerCase();

    return platformConfig.filter((platform) => {
      const matchesCategory = !categoryFilter || platform.category === categoryFilter;

      const matchesSearch =
        !query ||
        platform.name.toLowerCase().includes(query) ||
        platform.code.toLowerCase().includes(query) ||
        platform.category.toLowerCase().includes(query);

      const isActive = platform.link_active ?? true;
      const isConfigured = Boolean(platform.url?.trim());
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive) ||
        (statusFilter === "configured" && isConfigured);

      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [platformConfig, categoryFilter, statusFilter, search]);

  const paginatedPlatforms = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredPlatforms.slice(start, start + rowsPerPage);
  }, [filteredPlatforms, page, rowsPerPage]);

  const visitUrl = useCallback((url: string, isActive: boolean) => {
    if (!isActive || !url.trim()) return;
    window.open(normalizeIntegrationUrl(url), "_blank", "noopener,noreferrer");
  }, []);

  const deleteDialogMessage = useMemo(() => {
    if (!deleteTarget) return "";
    const { platform } = deleteTarget;
    if (platform.link_id) {
      return `Remove "${platform.name}" and its configured link from the marketing hub?`;
    }
    return `Remove "${platform.name}" from the marketing catalog?`;
  }, [deleteTarget]);

  return {
    loading,
    deleting,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    categoryFilterOptions,
    statusFilterOptions,
    deleteTarget,
    setDeleteTarget,
    error,
    setError,
    success,
    setSuccess,
    filteredPlatforms,
    paginatedPlatforms,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    handleConfirmDelete,
    requestDelete,
    visitUrl,
    deleteDialogMessage,
  };
}
