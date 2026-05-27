import {
  Alert,
  Box,
  Button,
  ButtonBase,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Grid from "@mui/material/Grid2";
import {
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";

import { PageHeader } from "../../components/layout";
import { ListPageLayout, PrimaryActionButton } from "../../components/reusable";
import { colorTokens } from "../../tokens/colors";
import {
  CALENDAR_LEGEND_ITEMS,
  getCalendarLegendDisplayLabel,
  getCalendarLegendStyle,
} from "./academicCalendarLegend";
import {
  isWeekendIso,
  OUTSIDE_ACADEMIC_YEAR_LABEL,
  WEEK_DAYS,
  WEEKEND_LABEL,
} from "./academicCalendar.utils";
import { useAcademicCalendarController } from "./useAcademicCalendarController";

const weekendCellBg = alpha(colorTokens.preschool.coral.light, 0.4);
const weekendLabelColor = colorTokens.error.main;

const headerSelectSx = {
  minWidth: { xs: "100%", sm: 220 },
  bgcolor: "#ffffff",
  borderRadius: "15px",
  fontSize: "0.85rem",
  fontWeight: 600,
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: colorTokens.border.subtle,
  },
} as const;

const legendCardSx = {
  display: "flex",
  width: "100%",
  justifyContent: "flex-end",
  px: { xs: 2, sm: 2.5 },
  py: 1.25,
  bgcolor: "#ffffff",
  border: `1px solid ${colorTokens.border.default}`,
  borderRadius: "14px",
  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
} as const;

const weekDayHeaderSx = {
  fontWeight: 800,
  fontSize: "0.8125rem",
  color: colorTokens.gray[600],
} as const;

const outsideAcademicYearTooltipSlotProps = {
  tooltip: {
    sx: {
      bgcolor: colorTokens.gray[200],
      color: colorTokens.primary.dark,
      fontWeight: 700,
      fontSize: "0.8125rem",
      px: 1.5,
      py: 0.75,
      boxShadow: 2,
      maxWidth: 220,
    },
  },
  arrow: {
    sx: {
      color: colorTokens.gray[200],
    },
  },
} as const;

export default function AcademicCalendar() {
  const c = useAcademicCalendarController();

  return (
    <>
      <ListPageLayout
        pageBackground
        contentPaddingSize="none"
        scrollableFormContent
        maxWidth={false}
        header={
          <Box sx={{ mb: 2 }}>
            <PageHeader
              links={[
                ...(c.showAddHolidayButton
                  ? [{ title: "Academic Management", path: "/academics/configuration/holidays" }]
                  : []),
                { title: "Academic Calendar", path: "#" },
              ]}
              homePath="/"
              actions={
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  className="academic-calendar-no-print"
                >
                  <Select
                    value={c.academicYearId ?? ""}
                    displayEmpty
                    size="small"
                    onChange={(e) => c.handleAcademicYearChange(Number(e.target.value))}
                    disabled={c.academicYears.length === 0}
                    sx={headerSelectSx}
                  >
                    <MenuItem value="" disabled>
                      <Typography variant="body2" color="text.secondary">
                        Academic Year
                      </Typography>
                    </MenuItem>
                    {c.academicYears.map((y) => (
                      <MenuItem key={y.id} value={y.id}>
                        {y.name} ({y.code})
                      </MenuItem>
                    ))}
                  </Select>
                  {c.showAddHolidayButton && (
                    <Tooltip title={c.addHolidayTooltip}>
                      <span
                        style={{
                          display: "inline-flex",
                          pointerEvents: c.canAddHoliday ? "auto" : "none",
                          opacity: c.canAddHoliday ? 1 : 0.45,
                        }}
                      >
                        <PrimaryActionButton
                          onClick={c.handleAddHoliday}
                          icon={<AddIcon sx={{ fontSize: 24 }} />}
                          label="Add Holiday"
                        />
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              }
            />
            <Box
              className="academic-calendar-no-print"
              sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}
            >
              <Box sx={legendCardSx}>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: "0.83rem", fontWeight: 700, color: "text.primary" }}>
                    Legend:
                  </Typography>
                  {CALENDAR_LEGEND_ITEMS.map((item) => (
                    <Box
                      key={item.key}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          width: 20,
                          height: 20,
                          bgcolor: item.main,
                          border: `1px solid ${item.main}`,
                        }}
                      />
                      <Typography variant="body2" sx={{ fontSize: "0.83rem", color: "text.primary", fontWeight: 400 }}>
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        }
      >
        <Box className="academic-calendar-root academic-calendar-print-area">
          {c.academicYearsQuery.isError && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => void c.academicYearsQuery.refetch()}>
                  Retry
                </Button>
              }
            >
              Failed to load academic years. Select an academic year to view the calendar.
            </Alert>
          )}

          <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={1}
                sx={{ mb: 1 }}
                className="academic-calendar-no-print"
              >
                <IconButton aria-label="Previous month" onClick={c.goPrevMonth} size="small">
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 200, textAlign: "center" }}>
                  {c.monthLabel}
                </Typography>
                <IconButton aria-label="Next month" onClick={c.goNextMonth} size="small">
                  <ChevronRightIcon />
                </IconButton>
              </Stack>

              <Box sx={{ overflowX: { xs: "auto", md: "visible" } }}>
                {c.calendarLoadFailed ? (
              <Alert
                severity="error"
                sx={{ mt: 1 }}
                action={
                  <Button color="inherit" size="small" onClick={() => void c.calendarQuery.refetch()}>
                    Retry
                  </Button>
                }
              >
                Failed to load calendar data for this month.
              </Alert>
            ) : c.showCalendarSkeleton ? (
              <Grid container columns={7} spacing={1} sx={{ mt: 1, minWidth: { xs: 560, sm: "auto" } }}>
                {WEEK_DAYS.map((d) => (
                  <Grid key={d} size={1}>
                    <Typography component="div" sx={weekDayHeaderSx}>
                      {d}
                    </Typography>
                  </Grid>
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                  <Grid key={`sk-${i}`} size={1}>
                    <Skeleton variant="rounded" height={72} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ mt: 1 }}>
                <Grid container columns={7} spacing={1} sx={{ minWidth: { xs: 560, sm: "auto" } }}>
                  {WEEK_DAYS.map((d) => (
                    <Grid key={d} size={1}>
                      <Typography
                        component="div"
                        sx={{
                          ...weekDayHeaderSx,
                          display: "block",
                          textAlign: "center",
                          py: 0.5,
                        }}
                      >
                        {d}
                      </Typography>
                    </Grid>
                  ))}
                  {c.cellsWithHolidays.map((cell) => {
                    if (cell.kind === "empty") {
                      return (
                        <Grid key={cell.key} size={1}>
                          <Box sx={{ minHeight: 96 }} />
                        </Grid>
                      );
                    }

                    const { holiday, dayNum, outsideAcademicYear } = cell;
                    const isHoliday = Boolean(holiday);
                    const isOutsideDay = outsideAcademicYear;
                    const canAddOnDay = !isOutsideDay && !isHoliday && c.canAddHoliday;
                    const legendStyle =
                      isHoliday && !isOutsideDay
                        ? getCalendarLegendStyle(holiday!.holiday_type, holiday!.holiday_name)
                        : null;
                    const legendLabel =
                      legendStyle != null
                        ? getCalendarLegendDisplayLabel(holiday!.holiday_type, holiday!.holiday_name)
                        : null;
                    const showWeekend = isWeekendIso(cell.iso) && !isOutsideDay;
                    const isCenteredCell = isOutsideDay || showWeekend || isHoliday;

                    const dayAriaLabel = isOutsideDay
                      ? `Day ${dayNum}, outside academic year`
                      : isHoliday
                        ? `Day ${dayNum}, ${holiday!.holiday_name}`
                        : showWeekend
                          ? `Day ${dayNum}, weekend`
                          : canAddOnDay
                            ? `Day ${dayNum}, add holiday`
                            : `Day ${dayNum}`;

                    const dayCellSx = {
                      minHeight: 96,
                      p: 1,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: isOutsideDay
                        ? alpha(colorTokens.preschool.coral.main, 0.35)
                        : showWeekend
                          ? alpha(weekendLabelColor, 0.25)
                          : legendStyle
                            ? alpha(legendStyle.main, 0.4)
                            : colorTokens.border.subtle,
                      bgcolor: isOutsideDay
                        ? alpha(colorTokens.preschool.coral.light, 0.35)
                        : showWeekend
                          ? weekendCellBg
                          : legendStyle
                            ? legendStyle.light
                            : colorTokens.background.paper,
                      width: "100%",
                      textAlign: isCenteredCell ? "center" : "left",
                      cursor: isOutsideDay ? "not-allowed" : canAddOnDay ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isCenteredCell ? "center" : "flex-start",
                      justifyContent: isCenteredCell ? "center" : "flex-start",
                      ...(canAddOnDay && {
                        "&:hover": {
                          borderColor: "primary.main",
                          bgcolor: "action.selected",
                        },
                      }),
                    };

                    const dayCellInner = (
                      <>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: colorTokens.text.primary,
                            width: "100%",
                            textAlign: isCenteredCell ? "center" : "left",
                          }}
                        >
                          {dayNum}
                        </Typography>
                        {isOutsideDay ? (
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              mt: 0.5,
                              width: "100%",
                              textAlign: "center",
                              color: colorTokens.preschool.coral.main,
                              fontWeight: 600,
                              lineHeight: 1.25,
                            }}
                          >
                            {OUTSIDE_ACADEMIC_YEAR_LABEL}
                          </Typography>
                        ) : (
                          <>
                            {showWeekend && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  mt: 0.5,
                                  width: "100%",
                                  textAlign: "center",
                                  color: weekendLabelColor,
                                  fontWeight: 700,
                                  lineHeight: 1.25,
                                }}
                              >
                                {WEEKEND_LABEL}
                              </Typography>
                            )}
                            {isHoliday && legendStyle && legendLabel && (
                              <>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: "block",
                                    mt: showWeekend ? 0.25 : 0.5,
                                    color: legendStyle.main,
                                    fontWeight: 700,
                                    lineHeight: 1.25,
                                    width: "100%",
                                    textAlign: "center",
                                  }}
                                >
                                  {legendLabel}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    mt: 0.25,
                                    color: legendStyle.main,
                                    fontWeight: 600,
                                    overflow: "hidden",
                                    display: "-webkit-box",
                                    WebkitBoxOrient: "vertical",
                                    WebkitLineClamp: 2,
                                    lineHeight: 1.25,
                                    width: "100%",
                                    textAlign: "center",
                                  }}
                                >
                                  {holiday!.holiday_name}
                                </Typography>
                              </>
                            )}
                          </>
                        )}
                      </>
                    );

                    const dayPaper = canAddOnDay ? (
                      <ButtonBase
                        component={Paper}
                        elevation={0}
                        onClick={() => c.handleDayClick(cell.iso, outsideAcademicYear, isHoliday)}
                        aria-label={dayAriaLabel}
                        sx={{ ...dayCellSx, display: "flex" }}
                      >
                        {dayCellInner}
                      </ButtonBase>
                    ) : (
                      <Paper elevation={0} aria-label={dayAriaLabel} sx={{ ...dayCellSx, display: "flex" }}>
                        {dayCellInner}
                      </Paper>
                    );

                    return (
                      <Grid key={cell.key} size={1}>
                        {isOutsideDay ? (
                          <Tooltip
                            title={OUTSIDE_ACADEMIC_YEAR_LABEL}
                            arrow
                            placement="bottom"
                            enterDelay={200}
                            slotProps={outsideAcademicYearTooltipSlotProps}
                          >
                            <Box component="span" sx={{ display: "block", width: "100%" }}>
                              {dayPaper}
                            </Box>
                          </Tooltip>
                        ) : (
                          dayPaper
                        )}
                      </Grid>
                    );
                  })}
                </Grid>

                {c.noHolidays && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 2, textAlign: "center", color: "text.secondary", fontWeight: 600 }}
                  >
                    {c.emptyMonthMessage}
                  </Typography>
                )}
              </Box>
            )}
              </Box>
          </Box>
        </Box>
      </ListPageLayout>
    </>
  );
}
