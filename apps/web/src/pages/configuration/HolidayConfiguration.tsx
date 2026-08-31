import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../../utils/listPagination";
import { Alert, AlertTitle, Box, Button as MuiButton, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";

import { PageHeader } from "../../components/layout";
import { EntityTableSection, ListPageLayout, ListPageToolbar } from "../../components/reusable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { academicYearService } from "../../api/services/academicYearService";
import holidayApi, { HolidayListItem } from "../../services/holidayApi";
import { useAuth } from "../../context/AuthContext";
import { resolveCurrentAcademicYearId } from "../../utils/academicYear";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import { createHolidayListConfig } from "./HolidayConfiguration.listConfig";


function useHolidayListController() {
  const { user } = useAuth();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const effectiveTenantId = user?.tenant_id ?? user?.tenant?.id ?? null;
  const hasTenantContext = !!effectiveTenantId;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | "">("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [deleteTarget, setDeleteTarget] = useState<HolidayListItem | null>(null);
  /** Last holiday id passed to delete API — used for snackbar retry so it stays valid if dialog closes. */
  const lastDeleteAttemptIdRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, selectedAcademicYearId]);

  const academicYearsQuery = useQuery({
    queryKey: ["holidays", "academic-years", effectiveTenantId],
    queryFn: academicYearService.listActive,
    enabled: true,
    retry: 1,
  });
  const academicYears = academicYearsQuery.data ?? [];

  useEffect(() => {
    if (academicYears.length === 0) return;
    const validIds = new Set(academicYears.map((y) => y.id));
    const currentYearId = resolveCurrentAcademicYearId(academicYears);
    const defaultYearId = currentYearId ? Number(currentYearId) : academicYears[0].id;
    if (selectedAcademicYearId === "") {
      setSelectedAcademicYearId(defaultYearId);
      return;
    }
    if (typeof selectedAcademicYearId === "number" && !validIds.has(selectedAcademicYearId)) {
      setSelectedAcademicYearId(defaultYearId);
    }
  }, [academicYears, selectedAcademicYearId]);

  const holidaysQuery = useQuery({
    queryKey: [
      "holidays",
      {
        academic_year_id: selectedAcademicYearId,
        search: debouncedSearch,
        page,
        page_size: rowsPerPage,
      },
    ],
    queryFn: () =>
      holidayApi.list({
        academic_year_id: Number(selectedAcademicYearId),
        search: debouncedSearch || undefined,
        page: page + 1,
        page_size: rowsPerPage,
      }),
    enabled: selectedAcademicYearId !== "",
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!holidaysQuery.isSuccess || holidaysQuery.data == null) return;
    const totalRows = holidaysQuery.data.total;
    const maxPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [holidaysQuery.isSuccess, holidaysQuery.data, rowsPerPage, page]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      lastDeleteAttemptIdRef.current = id;
      return holidayApi.delete(id);
    },
    onSuccess: async () => {
      enqueueSnackbar("Holiday deleted successfully.", {
        variant: "success",
        autoHideDuration: 3000,
        anchorOrigin: { vertical: "top", horizontal: "center" },
      });
      await queryClient.invalidateQueries({ queryKey: ["holidays"] });
      setDeleteTarget(null);
      lastDeleteAttemptIdRef.current = null;
    },
    onError: () => {
      const key = enqueueSnackbar("Failed to delete holiday", {
        variant: "error",
        persist: true,
        action: () => {
          const idToRetry = lastDeleteAttemptIdRef.current;
          return (
            <>
              <MuiButton
                size="small"
                disabled={idToRetry == null}
                aria-label="Retry delete holiday"
                onClick={() => {
                  closeSnackbar(key);
                  if (idToRetry != null) {
                    void deleteMutation.mutateAsync(idToRetry);
                  }
                }}
              >
                Retry
              </MuiButton>
              <MuiButton
                size="small"
                aria-label="Dismiss delete error"
                onClick={() => {
                  lastDeleteAttemptIdRef.current = null;
                  closeSnackbar(key);
                }}
              >
                Dismiss
              </MuiButton>
            </>
          );
        },
      });
    },
  });

  const loading = holidaysQuery.isLoading || holidaysQuery.isFetching;
  const rows: HolidayListItem[] = holidaysQuery.data?.data ?? [];
  const total = holidaysQuery.data?.total ?? 0;

  const retryAcademicYears = () => {
    void academicYearsQuery.refetch();
  };

  const retryHolidays = () => {
    void holidaysQuery.refetch();
  };

  const dismissHolidaysError = () => {
    void queryClient.resetQueries({
      queryKey: [
        "holidays",
        {
          academic_year_id: selectedAcademicYearId,
          search: debouncedSearch,
          page,
          page_size: rowsPerPage,
        },
      ],
      exact: true,
    });
  };

  const dismissAcademicYearsError = () => {
    void queryClient.resetQueries({
      queryKey: ["holidays", "academic-years", effectiveTenantId],
      exact: true,
    });
  };

  const dismissDeleteDialog = () => {
    if (deleteMutation.isPending) return;
    setDeleteTarget(null);
    lastDeleteAttemptIdRef.current = null;
  };

  const academicYearOptions = useMemo(
    () => academicYears.map((year) => ({ label: year.name, value: String(year.id) })),
    [academicYears],
  );

  return {
    hasTenantContext,
    search,
    setSearch,
    selectedAcademicYearId,
    setSelectedAcademicYearId,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    academicYearsQuery,
    academicYearOptions,
    holidaysQuery,
    loading,
    rows,
    total,
    deleteMutation,
    deleteTarget,
    setDeleteTarget,
    dismissDeleteDialog,
    retryAcademicYears,
    retryHolidays,
    dismissHolidaysError,
    dismissAcademicYearsError,
  };
}

export default function HolidayConfiguration() {
  const controller = useHolidayListController();
  const { buildListBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();
  const breadcrumbLinks = buildListBreadcrumbs("Holiday List");

  const listConfig = useMemo(
    () =>
      createHolidayListConfig({
        navigate: navigateWithConfigHub,
        selectedAcademicYearId: controller.selectedAcademicYearId,
        onDeleteClick: controller.setDeleteTarget,
      }),
    [controller.selectedAcademicYearId, controller.setDeleteTarget, navigateWithConfigHub],
  );

  const academicYearFilterValue =
    controller.selectedAcademicYearId === "" ? "" : String(controller.selectedAcademicYearId);

  return (
    <ListPageLayout
      onRefresh={async () => {
        await Promise.all([
          controller.holidaysQuery.refetch(),
          controller.academicYearsQuery.refetch(),
        ]);
      }}
      pageBackground
      contentPaddingSize="none"
      header={
        <>
          <PageHeader
            links={breadcrumbLinks}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={controller.search}
                onSearchChange={controller.setSearch}
                searchPlaceholder="Search holidays..."
                filters={[
                  {
                    label: "Academic Year",
                    value: academicYearFilterValue,
                    onChange: (value) => controller.setSelectedAcademicYearId(value ? Number(value) : ""),
                    options: controller.academicYearOptions,
                    disabled:
                      controller.academicYearsQuery.isLoading || controller.academicYearOptions.length === 0,
                  },
                ]}
                onAddClick={() => navigateWithConfigHub("/academics/configuration/holidays/new")}
                addLabel="Add Holiday"
                addIcon={<AddIcon sx={{ fontSize: 24 }} />}
              />
            }
          />

          {controller.holidaysQuery.isError ? (
            <Box sx={{ m: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
              <Typography variant="body2" color="error">
                {listConfig.uiPolicy.errorFallbackMessage}
              </Typography>
              <MuiButton
                variant="outlined"
                color="error"
                size="small"
                aria-label="Retry loading holidays"
                onClick={controller.retryHolidays}
                disabled={controller.loading}
              >
                {listConfig.uiPolicy.retryLabel}
              </MuiButton>
            </Box>
          ) : null}

          {controller.academicYearsQuery.isError ? (
            <Alert
              severity="error"
              sx={{ m: 2 }}
              action={
                <>
                  <MuiButton size="small" aria-label="Retry loading academic years" onClick={controller.retryAcademicYears}>
                    Retry
                  </MuiButton>
                  <MuiButton
                    size="small"
                    aria-label="Dismiss academic years error"
                    onClick={controller.dismissAcademicYearsError}
                  >
                    Dismiss
                  </MuiButton>
                </>
              }
            >
              <AlertTitle>Failed to load academic years</AlertTitle>
              Holiday list requires an academic year selection.
            </Alert>
          ) : null}

          {!controller.hasTenantContext ? (
            <Alert severity="warning" sx={{ m: 2 }}>
              This page requires tenant context. Switch to a tenant account (or impersonate a tenant) to configure holidays.
            </Alert>
          ) : null}
        </>
      }
    >
      <EntityTableSection<HolidayListItem>
        label="Holiday List"
        showInfoBar={false}
        totalRows={controller.total}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.setPage}
        onRowsPerPageChange={(value) => {
          controller.setRowsPerPage(value);
          controller.setPage(0);
        }}
        columns={listConfig.columns}
        data={controller.rows}
        loading={controller.loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        rowActions={listConfig.actions.rowActions}
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={!!controller.deleteTarget}
        title="Please Confirm"
        message="Are you sure you want to delete holiday?"
        confirmText={controller.deleteMutation.isPending ? "Deleting…" : "Confirm"}
        onCancel={controller.dismissDeleteDialog}
        onConfirm={() => {
          if (!controller.deleteTarget) return;
          void controller.deleteMutation.mutateAsync(controller.deleteTarget.id);
        }}
        loading={controller.deleteMutation.isPending}
      />
    </ListPageLayout>
  );
}
