// Assign Fee to Student Page (scaffold)


import React, { useEffect, useState } from "react";
import {
  Box, Typography, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, Alert, TextField, Checkbox, FormGroup, FormControlLabel, Divider
} from "@mui/material";
import studentService, { StudentDropdownItem, StudentDetails } from "../../api/services/studentService";
import { academicYearService } from "../../api/services/dropdownServices";
import { feeStructureService } from "../../api/services/dropdownServices";
import feeDiscountService from "../../api/services/feeDiscountService";

const optionalComponents = [
  { label: "Transportation (Bus)", value: "bus" },
  { label: "Laboratory Access", value: "lab" },
  { label: "Library Membership", value: "library" },
];

const AssignStudentFee: React.FC = () => {
  const [students, setStudents] = useState<StudentDropdownItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [studentInfo, setStudentInfo] = useState<StudentDetails | null>(null);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState<string>("");
  const [optional, setOptional] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Fee Discount dropdown state
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [selectedDiscount, setSelectedDiscount] = useState("");
  // Fetch available discounts on mount
  useEffect(() => {
    feeDiscountService.list({ page_size: 100 }).then(res => {
      setDiscounts(res.data || res.items || []);
    });
  }, []);

  // Fetch students and academic years on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      studentService.getStudentsDropdown(),
      academicYearService.list()
    ])
      .then(([stu, years]) => {
        setStudents(stu);
        setAcademicYears(years.data || years);
      })
      .catch(() => setError("Failed to load students or academic years."))
      .finally(() => setLoading(false));
  }, []);

  // Fetch student info when selected
  useEffect(() => {
    if (!selectedStudent) {
      setStudentInfo(null);
      return;
    }
    setLoading(true);
    studentService.getStudentById(selectedStudent)
      .then(data => setStudentInfo({
        ...data
      }))
      .catch(() => setError("Failed to load student info."))
      .finally(() => setLoading(false));
  }, [selectedStudent]);

  // Fetch fee structures only after both student and academic year are selected
  useEffect(() => {
    const fetchFeeStructures = async () => {
      if (!selectedStudent || !selectedAcademicYear || !studentInfo) {
        setFeeStructures([]);
        setSelectedFeeStructure("");
        return;
      }
      setLoading(true);
      try {
        console.log("studentInfo before API call:", studentInfo);
        const response = await feeStructureService.list({
          academicYear: selectedAcademicYear,
          classId: studentInfo.classId !== undefined ? studentInfo.classId : "",
          tenantId: studentInfo.tenantId !== undefined ? studentInfo.tenantId : ""
        });
        console.log("API Response:", response);
        const items = response.data || response;
        setFeeStructures(items);
        // Set the selected fee structure if present
        if (studentInfo.feeStructureId) {
          setSelectedFeeStructure(String(studentInfo.feeStructureId));
        } else {
          setSelectedFeeStructure("");
        }
      } catch (err) {
        setError("Failed to load fee structures.");
      } finally {
        setLoading(false);
      }
    };
    if (selectedStudent && selectedAcademicYear && studentInfo) {
      fetchFeeStructures();
    } else {
      setFeeStructures([]);
      setSelectedFeeStructure("");
    }
  }, [selectedStudent, selectedAcademicYear, studentInfo]);

  const handleOptionalChange = (value: string) => {
    setOptional((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    // TODO: Implement API call to assign fee ledger
    setSuccess("Fee ledger generated successfully (mocked).");
  };

  return (
    <Box maxWidth={900} mx="auto" mt={4}>
      <Typography variant="h5" mb={2} fontWeight={600}>Assign Fee to Student</Typography>
      <Typography variant="body1" mb={3} color="text.secondary">
        Assign a fee structure to an individual student and generate their personalized fee ledger.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Student Search Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>Student Search</Typography>
          <FormControl fullWidth>
            <InputLabel>Student</InputLabel>
            <Select
              value={selectedStudent}
              label="Student"
              onChange={e => setSelectedStudent(e.target.value as string)}
            >
              <MenuItem value="">Select Student</MenuItem>
              {students.map(stu => (
                <MenuItem key={stu.id} value={stu.id}>{stu.name} ({stu.className})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Student Information Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight={600}>Student Information</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedStudent ? "SELECTED" : "AWAITING SELECTION"}
            </Typography>
          </Box>
          {studentInfo ? (
            <Box>
              <Typography><b>Name:</b> {studentInfo.name}</Typography>
              <Typography><b>Class:</b> {studentInfo.className}</Typography>
              {/* Add more fields as needed */}
            </Box>
          ) : (
            <Box textAlign="center" color="text.secondary" py={4}>
              <Typography>Search and select a student above to view details</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Fee Configuration Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Fee Configuration</Typography>
          <form onSubmit={handleSubmit}>
            <Box display="flex" gap={2} mb={2}>
              <FormControl fullWidth>
                <InputLabel>Academic Year</InputLabel>
                <Select
                  value={selectedAcademicYear}
                  label="Academic Year"
                  onChange={e => setSelectedAcademicYear(e.target.value as string)}
                  required
                >
                  <MenuItem value="">Select Academic Year</MenuItem>
                  {academicYears.map((year: any) => (
                    <MenuItem key={year.id} value={String(year.id)}>{year.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Fee Structure Template</InputLabel>
                <Select
                  value={selectedFeeStructure}
                  label="Fee Structure Template"
                  onChange={e => setSelectedFeeStructure(e.target.value as string)}
                  required
                  disabled={!selectedAcademicYear || !selectedStudent || loading}
                >
                  {feeStructures && feeStructures.length > 0 ? (
                    feeStructures.map((fs: any) => (
                      <MenuItem key={fs.id} value={String(fs.id)}>{fs.name}</MenuItem>
                    ))
                  ) : (
                    <MenuItem value="">No Data Available</MenuItem>
                  )}
                </Select>
              </FormControl>
              {/* Fee Discount Dropdown */}
              <FormControl fullWidth>
                <InputLabel>Fee Discount</InputLabel>
                <Select
                  value={selectedDiscount}
                  label="Fee Discount"
                  onChange={e => setSelectedDiscount(e.target.value as string)}
                  disabled={discounts.length === 0}
                >
                  <MenuItem value="">No Discount</MenuItem>
                  {discounts.map((discount: any) => (
                    <MenuItem key={discount.id} value={discount.id}>
                      {discount.discount_name} ({discount.discount_type === "PERCENTAGE" ? `${discount.discount_value}%` : `₹${discount.discount_value}`})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Typography variant="subtitle2" mb={1}>Include Optional Components</Typography>
            <FormGroup row sx={{ mb: 2 }}>
              {optionalComponents.map(opt => (
                <FormControlLabel
                  key={opt.value}
                  control={<Checkbox checked={optional.includes(opt.value)} onChange={() => handleOptionalChange(opt.value)} />}
                  label={opt.label}
                />
              ))}
            </FormGroup>
            <Typography variant="subtitle2" mb={1}>Special Remarks (Optional)</Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              placeholder="Add any notes about manual discounts or special payment arrangements..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Divider sx={{ mb: 2 }} />
            <Box textAlign="right">
              <Button
                type="submit"
                variant="contained"
                color="warning"
                disabled={loading || !selectedStudent || !selectedAcademicYear || !selectedFeeStructure}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Generate Fee Ledger
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AssignStudentFee;
