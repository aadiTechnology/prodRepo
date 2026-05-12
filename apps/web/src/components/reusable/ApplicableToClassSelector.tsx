import { Box, Typography } from "../primitives";
import { Checkbox, FormControlLabel } from "@mui/material";

export type ApplicableRole = "student" | "teacher" | "admin";

export type ApplicableRoleState = Record<ApplicableRole, boolean>;

export type ClassDivisionColumn = {
  id: number;
  name: string;
  divisions: { id: number; name: string }[];
};

type Props = {
  applicableTo: ApplicableRoleState;
  isApplicableSelectAll: boolean;
  isClassSelectAll: boolean;
  classDivisionMap: ClassDivisionColumn[];
  selectedClassIds: number[];
  selectedDivisionIds: number[];
  error?: string | null;
  onApplicableSelectAll: (checked: boolean) => void;
  onApplicableRoleToggle: (role: ApplicableRole) => void;
  onClassSelectAll: (checked: boolean) => void;
  onClassToggle: (classId: number, checked: boolean) => void;
  onDivisionToggle: (classId: number, divisionId: number, checked: boolean) => void;
  /** When true, hides Admin/Teacher/Student role checkboxes (audience is chosen elsewhere). */
  hideApplicableRoleControls?: boolean;
};

export default function ApplicableToClassSelector({
  applicableTo,
  isApplicableSelectAll,
  isClassSelectAll,
  classDivisionMap,
  selectedClassIds,
  selectedDivisionIds,
  error,
  onApplicableSelectAll,
  onApplicableRoleToggle,
  onClassSelectAll,
  onClassToggle,
  onDivisionToggle,
  hideApplicableRoleControls = false,
}: Props) {
  const showClassTargetSection = hideApplicableRoleControls || applicableTo.student;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
      {!hideApplicableRoleControls ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Applicable to:
          </Typography>
          <Box sx={{ bgcolor: "#f0f0f0", px: 1, py: 0.4, width: "fit-content" }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={isApplicableSelectAll}
                  onChange={(e) => onApplicableSelectAll(e.target.checked)}
                />
              }
              label="Select All"
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2.5, flexWrap: "wrap" }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={applicableTo.admin}
                  onChange={() => onApplicableRoleToggle("admin")}
                />
              }
              label="Admin"
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={applicableTo.teacher}
                  onChange={() => onApplicableRoleToggle("teacher")}
                />
              }
              label="Teacher"
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={applicableTo.student}
                  onChange={() => onApplicableRoleToggle("student")}
                />
              }
              label="Student"
            />
          </Box>
        </>
      ) : null}
      {error ? (
        <Typography variant="caption" color="error" sx={{ mt: -0.5 }}>
          {error}
        </Typography>
      ) : null}

      {showClassTargetSection ? (
        <Box
          sx={{
            mt: 0.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: 1.25,
            bgcolor: "#fafafa",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.8 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mr: 0.25 }}>
              Associated Classes 
            </Typography>
            <Checkbox
              size="small"
              checked={isClassSelectAll}
              onChange={(e) => onClassSelectAll(e.target.checked)}
            />
          </Box>
          <Box sx={{ bgcolor: "#d9d9d9", px: 1, py: 0.45, mb: 0.8, borderRadius: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Associated Class(es)
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 2.75,
              overflowX: "auto",
              pb: 1,
            }}
          >
            {classDivisionMap.map((cls) => (
              <Box
                key={`class-col-${cls.id}`}
                sx={{
                  minWidth: 120,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.25,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.35,
                    minHeight: 30,
                    borderBottom: "1px solid #bdbdbd",
                    pb: 0.25,
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={selectedClassIds.includes(cls.id)}
                    onChange={(e) => onClassToggle(cls.id, e.target.checked)}
                  />
                  <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {cls.name}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.05 }}>
                  {cls.divisions.map((division) => (
                    <Box
                      key={`div-${cls.id}-${division.id}`}
                      sx={{ display: "flex", alignItems: "center", minHeight: 28 }}
                    >
                      <Checkbox
                        size="small"
                        checked={selectedDivisionIds.includes(division.id)}
                        onChange={(e) => onDivisionToggle(cls.id, division.id, e.target.checked)}
                      />
                      <Typography variant="body2" sx={{ fontSize: 13 }}>
                        {division.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
