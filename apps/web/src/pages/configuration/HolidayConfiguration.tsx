import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  alpha,
  Box,
  Button as MuiButton,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { Add as AddIcon, Search as SearchIcon } from "@mui/icons-material";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";

import { PageHeader } from "../../components/layout";
import { EntityTableSection, ListPageLayout, PrimaryActionButton, TableRowActions } from "../../components/reusable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { colorTokens } from "../../tokens/colors";
import { academicYearService } from "../../api/services/academicYearService";
import holidayApi, { HolidayListItem, holidayInclusiveDayCount, parseHolidayDateRange } from "../../services/holidayApi";
import { useAuth } from "../../context/AuthContext";

function createHolidayTableColumns() {
  return [
    { id: "holiday_name", label: "Holiday Name", field: "holiday_name" },
    {
      id: "start_date",
      label: "Start Date",
      render: (row: HolidayListItem) => {
        const { start } = parseHolidayDateRange(row.holiday_date);
        return start || "—";
      },
    },
    {
      id: "end_date",
      label: "End Date",
      render: (row: HolidayListItem) => {
        const { start, end } = parseHolidayDateRange(row.holiday_date);
        return end && end !== start ? end : start || "—";
      },
    },
    {
      id: "total_days",
      label: "Total Days",
      render: (row: HolidayListItem) =>
        row.total_days != null ? String(row.total_days) : String(holidayInclusiveDayCount(row.holiday_date)),
    },
    { id: "applicable_for", label: "Applicable For", field: "applicable_for" },
  ];
}

function useHolidayListController() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const effectiveTenantId = user?.tenant_id ?? user?.tenant?.id ?? null;
  const hasTenantContext = !!effectiveTenantId;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | "">("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
    queryFn: academicYearService.getAll,
    enabled: true,
    retry: 1,
  });
  const academicYears = academicYearsQuery.data ?? [];

  useEffect(() => {
    if (academicYears.length === 0) return;
    const validIds = new Set(academicYears.map((y) => y.id));
    if (selectedAcademicYearId === "") {
      setSelectedAcademicYearId(academicYears[0].id);
      return;
    }
    if (typeof selectedAcademicYearId === "number" && !validIds.has(selectedAcademicYearId)) {
      setSelectedAcademicYearId(academicYears[0].id);
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
      enqueueSnackbar("Holiday deleted successfully", {
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

  const columns = useMemo(() => createHolidayTableColumns(), []);

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

  return {
    navigate,
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
    academicYears,
    holidaysQuery,
    loading,
    rows,
    total,
    columns,
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
  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      header={
        <>
          <PageHeader
            links={[{ title: "Holiday list", path: "#" }]}
            homePath="/"
            actions={
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 2,
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
                  <InputLabel id="holiday-academic-year-label">Academic Year</InputLabel>
                  <Select
                    labelId="holiday-academic-year-label"
                    id="holiday-academic-year-select"
                    label="Academic Year"
                    value={controller.selectedAcademicYearId}
                    displayEmpty
                    disabled={controller.academicYearsQuery.isLoading || controller.academicYears.length === 0}
                    renderValue={() => {
                      if (controller.academicYearsQuery.isLoading) return null;
                      if (controller.academicYears.length === 0) return null;
                      const sel = controller.selectedAcademicYearId;
                      if (sel === "" || sel === undefined) return null;
                      const year = controller.academicYears.find((y) => y.id === sel);
                      return year?.name ?? "";
                    }}
                    onChange={(e) => controller.setSelectedAcademicYearId(Number(e.target.value))}
                  >
                    <MenuItem value="" sx={{ display: "none" }} aria-hidden>
                      &nbsp;
                    </MenuItem>
                    {controller.academicYears.map((year) => (
                      <MenuItem key={year.id} value={year.id}>
                        {year.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
                  <TextField
                    placeholder="Search holidays..."
                    value={controller.search}
                    onChange={(e) => controller.setSearch(e.target.value)}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={(theme) => ({ color: theme.palette.grey[500], fontSize: 20 })} />
                        </InputAdornment>
                      ),
                    }}
                    sx={(theme) => ({
                      width: { xs: "100%", sm: 280 },
                      maxWidth: "100%",
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "#ffffff",
                        borderRadius: "15px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        "& fieldset": { borderColor: colorTokens.border.subtle },
                        "&:hover fieldset": { borderColor: alpha(colorTokens.preschool.turquoise.main, 0.4) },
                        "&.Mui-focused fieldset": { borderColor: colorTokens.preschool.turquoise.main },
                      },
                    })}
                  />
                  <PrimaryActionButton
                    onClick={() => controller.navigate("/academics/configuration/holidays/new")}
                    icon={<AddIcon sx={{ fontSize: 24 }} />}
                    label="Add Holiday"
                  />
                </Stack>
              </Box>
            }
          />
        </>
      }
    >
      <Box sx={{ px: 2, pb: 2 }}>
        <Stack spacing={2}>
          {controller.holidaysQuery.isError && (
            <Alert
              severity="error"
              sx={{ mb: 0 }}
              action={
                <>
                  <MuiButton size="small" aria-label="Retry loading holidays" onClick={controller.retryHolidays}>
                    Retry
                  </MuiButton>
                  <MuiButton size="small" aria-label="Dismiss holidays error" onClick={controller.dismissHolidaysError}>
                    Dismiss
                  </MuiButton>
                </>
              }
            >
              <AlertTitle>Failed to load holidays</AlertTitle>
              Try again or adjust your filters.
            </Alert>
          )}
          {controller.academicYearsQuery.isError && (
            <Alert
              severity="error"
              sx={{ mb: 0 }}
              action={
                <>
                  <MuiButton size="small" aria-label="Retry loading academic years" onClick={controller.retryAcademicYears}>
                    Retry
                  </MuiButton>
                  <MuiButton size="small" aria-label="Dismiss academic years error" onClick={controller.dismissAcademicYearsError}>
                    Dismiss
                  </MuiButton>
                </>
              }
            >
              <AlertTitle>Failed to load academic years</AlertTitle>
              Holiday list requires an academic year selection.
            </Alert>
          )}
          {!controller.hasTenantContext && (
            <Alert severity="warning" sx={{ mb: 0 }}>
              This page requires tenant context. Switch to a tenant account (or impersonate a tenant) to configure holidays.
            </Alert>
          )}
        </Stack>

        <Box sx={{ mt: 3 }}>
          <EntityTableSection<HolidayListItem>
            label="Holidays"
            totalRows={controller.total}
            page={controller.page}
            rowsPerPage={controller.rowsPerPage}
            onPageChange={controller.setPage}
            onRowsPerPageChange={(value) => {
              controller.setRowsPerPage(value);
              controller.setPage(0);
            }}
            columns={controller.columns}
            data={controller.rows}
            loading={controller.loading}
            emptyMessage="No holidays found"
            renderRowActions={(row) => (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <TableRowActions
                  onEdit={() =>
                    controller.navigate(
                      controller.selectedAcademicYearId !== ""
                        ? `/academics/configuration/holidays/${row.id}/edit?academic_year_id=${controller.selectedAcademicYearId}`
                        : `/academics/configuration/holidays/${row.id}/edit`,
                    )
                  }
                  onDelete={() => controller.setDeleteTarget(row)}
                />
              </Box>
            )}
            stickyHeader
            size="small"
          />
        </Box>
      </Box>
      <ConfirmDialog
        open={!!controller.deleteTarget}
        title="Delete Holiday"
        message={
          controller.deleteTarget
            ? `Delete "${controller.deleteTarget.holiday_name}"? This action cannot be undone.`
            : "Delete selected holiday?"
        }
        confirmText="Delete"
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
