
import React, { useState, useEffect } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import { fetchStudents } from "../api/studentFeeLedger";

interface StudentOption {
  value: number;
  label: string;
  student_code: string;
  academic_year: string;
}

interface StudentDropdownProps {
  onSelect: (student: StudentOption | null) => void;
  tenantId: number;
}

const StudentDropdown: React.FC<StudentDropdownProps> = ({ onSelect, tenantId }) => {
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [value, setValue] = useState<StudentOption | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchStudents(inputValue, tenantId)
      .then((students) => {
        if (active) {
          setOptions(
            students.map((s: any) => ({
              value: s.id,
              label: `${s.student_name} (${s.student_code})`,
              student_code: s.student_code,
              academic_year: s.academic_year
            }))
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [inputValue, tenantId]);

  return (
    <Autocomplete
      options={options}
      loading={loading}
      value={value}
      onChange={(_, newValue) => {
        setValue(newValue);
        onSelect(newValue);
      }}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      isOptionEqualToValue={(option, val) => option.value === val.value}
      getOptionLabel={(option) => option.label}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search student..."
          variant="outlined"
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      noOptionsText="No students found"
      sx={{ minWidth: 260 }}
      clearOnBlur={false}
    />
  );
};

export default StudentDropdown;