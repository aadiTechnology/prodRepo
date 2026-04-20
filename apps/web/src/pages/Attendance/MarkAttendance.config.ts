import { DataTableProps } from "../../components/reusable/DataTable";
import { AttendanceResponse } from "../../api/services/attendanceService";

export const ATTENDANCE_STATUSES = [
  { id: 'Present', label: 'Present', color: 'success', short: 'P' },
  { id: 'Absent', label: 'Absent', color: 'error', short: 'A' },
  { id: 'Half Day', label: 'Half Day', color: 'warning', short: 'HD' },
  { id: 'Leave', label: 'Leave', color: 'info', short: 'L' },
] as const;

export interface MarkAttendanceColumnsProps {
  onStatusChange: (studentId: number, status: string) => void;
  onRemarksChange: (studentId: number, remarks: string) => void;
}

export const createMarkAttendanceColumns = (
  { onStatusChange, onRemarksChange }: MarkAttendanceColumnsProps
): DataTableProps<AttendanceResponse>["columns"] => [
  {
    id: "roll_no",
    label: "Roll #",
    width: "80px",
    render: (row) => row.roll_no || "-",
  },
  {
    id: "student_name",
    label: "Student Name",
    render: (row) => row.student_name,
  },
  {
    id: "status",
    label: "Attendance Status",
    align: "center",
    width: "250px",
    // Rendering logic will be handled inside the component or a dedicated cell component
    // but we define the column here for structure.
  },
  {
    id: "remarks",
    label: "Remarks",
    width: "300px",
  }
];
