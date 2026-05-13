import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button as MuiButton,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";

import { PageHeader } from "../../components/layout";
import { EntityTableSection, ListPageLayout, ListPageToolbar, TableRowActions } from "../../components/reusable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { colorTokens } from "../../tokens/colors";
import { academicYearService } from "../../api/services/academicYearService";
import holidayApi, { HolidayListItem, HolidayType } from "../../services/holidayApi";
import { useAuth } from "../../context/AuthContext";

const HOLIDAY_TYPE_OPTIONS: { label: string; value: HolidayType }[] = [
  { label: "Public Holiday", value: "PUBLIC_HOLIDAY" },
  { label: "Academic Break", value: "ACADEMIC_BREAK" },
  { label: "Non-Teaching Day", value: "NON_TEACHING_DAY" },
];

function renderHolidayTypeFilterValue(selected: HolidayType | ""): ReactNode {
  if (selected === "") {
    return null;
  }
  return HOLIDAY_TYPE_OPTIONS.find((o) => o.value === selected)?.label ?? selected;
}

function mapHolidayTypeColor(type: HolidayType) {
  if (type === "PUBLIC_HOLIDAY") {
    return { bg: colorTokens.info.light, text: colorTokens.info.dark };
  }
  if (type === "ACADEMIC_BREAK") {
    return { bg: colorTokens.success.light, text: colorTokens.success.dark };
  }
  return { bg: colorTokens.primary.light, text: colorTokens.primary.dark };
}

function createHolidayTableColumns() {
  return [
    { id: "holiday_name", label: "Holiday Name", field: "holiday_name" },
    { id: "holiday_date", label: "Holiday Date", field: "holiday_date" },
    {
      id: "holiday_type",
      label: "Holiday Type",
      render: (row: HolidayListItem) => {
        const colors = mapHolidayTypeColor(row.holiday_type);
        return (
          <Chip
            size="small"
            label={row.holiday_type}
            sx={{
              backgroundColor: colors.bg,
              color: colors.text,
              fontWeight: 700,
              borderRadius: 1,
            }}
          />
        );
      },
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
  const [holidayTypeFilter, setHolidayTypeFilter] = useState<HolidayType | "">("");
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
  }, [debouncedSearch, holidayTypeFilter, selectedAcademicYearId]);

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
        holiday_type: holidayTypeFilter,
        search: debouncedSearch,
        page,
        page_size: rowsPerPage,
      },
    ],
    queryFn: () =>
      holidayApi.list({
        academic_year_id: Number(selectedAcademicYearId),
        holiday_type: holidayTypeFilter || undefined,
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
        persist: true,
        action: (snackbarKey) => (
          <MuiButton size="small" aria-label="Dismiss success message" onClick={() => closeSnackbar(snackbarKey)}>
            Dismiss
          </MuiButton>
        ),
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
  const summary = holidaysQuery.data?.summary ?? {
    total_holidays: 0,
    public_holidays: 0,
    academic_breaks: 0,
    non_teaching: 0,
  };

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
          holiday_type: holidayTypeFilter,
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
    holidayTypeFilter,
    setHolidayTypeFilter,
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
    summary,
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
            links={[{ title: "Academic Management", path: "#" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={controller.search}
                onSearchChange={controller.setSearch}
                searchPlaceholder="Search holidays..."
                onAddClick={() => controller.navigate("/academics/configuration/holidays/new")}
                addLabel="Add Holiday"
                addIcon={<AddIcon sx={{ fontSize: 24 }} />}
                renderActions={
                  <>
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
                    <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
                      <InputLabel id="holiday-type-filter-label">Holiday Type</InputLabel>
                      <Select
                        labelId="holiday-type-filter-label"
                        id="holiday-type-filter-select"
                        label="Holiday Type"
                        value={controller.holidayTypeFilter}
                        displayEmpty
                        renderValue={(selected) => renderHolidayTypeFilterValue(selected as HolidayType | "")}
                        onChange={(e) =>
                          controller.setHolidayTypeFilter(e.target.value as HolidayType | "")
                        }
                      >
                        {/* Keeps value="" valid for MUI; not shown as a normal list choice */}
                        <MenuItem value="" sx={{ display: "none" }} aria-hidden>
                          &nbsp;
                        </MenuItem>
                        {HOLIDAY_TYPE_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                }
                actionsAfterSearch
              />
            }
          />
          <Box sx={{ px: 2, pb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} lg={3}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: "none",
                    border: `1px solid ${colorTokens.border.default}`,
                    backgroundColor: colorTokens.background.paper,
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: colorTokens.text.secondary, fontWeight: 600 }}>
                      Total Holidays
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {controller.loading ? <Skeleton width={70} /> : controller.summary.total_holidays}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: "none",
                    border: `1px solid ${colorTokens.border.default}`,
                    backgroundColor: colorTokens.background.paper,
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: colorTokens.text.secondary, fontWeight: 600 }}>
                      Public Holidays
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {controller.loading ? <Skeleton width={70} /> : controller.summary.public_holidays}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: "none",
                    border: `1px solid ${colorTokens.border.default}`,
                    backgroundColor: colorTokens.background.paper,
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: colorTokens.text.secondary, fontWeight: 600 }}>
                      Academic Breaks
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {controller.loading ? <Skeleton width={70} /> : controller.summary.academic_breaks}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: "none",
                    border: `1px solid ${colorTokens.border.default}`,
                    backgroundColor: colorTokens.background.paper,
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: colorTokens.text.secondary, fontWeight: 600 }}>
                      Non-Teaching
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {controller.loading ? <Skeleton width={70} /> : controller.summary.non_teaching}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
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
