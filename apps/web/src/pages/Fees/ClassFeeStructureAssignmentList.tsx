import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box,
    Typography,
    Alert,
    CircularProgress,
    Snackbar,
    IconButton,
    Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
    Home as HomeIcon,
    Edit as EditIcon,
} from "@mui/icons-material";
import { classFeeStructureAssignmentService } from "../../api/services/classFeeStructureAssignmentService";
import { useAuth } from "../../context/AuthContext";
import {
    ListPageLayout,
    ListPageToolbar,
    DirectoryInfoBar,
    DataTable,
    TableRowActions,
    TablePaginationBar
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import StatusChip from "../../components/roles/StatusChip";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import AssignmentModal from "./AssignmentModal";
import { ClassFeeStructureAssignment } from "../../api/services/classFeeStructureAssignmentService";
import { classService, academicYearService, feeStructureService } from "../../api/services/dropdownServices";

const ClassFeeStructureAssignmentList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<ClassFeeStructureAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalAssignments, setTotalAssignments] = useState(0);
    // Removed modalOpen and editAssignment state, navigation will be used for edit
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [assignmentToDeactivate, setAssignmentToDeactivate] = useState<ClassFeeStructureAssignment | null>(null);
    const [deactivateLoading, setDeactivateLoading] = useState(false);
    const [snackbar, setSnackbar] = useState<string | null>(null);
    const showSuccessToast = (message: string) => setSnackbar(message);
    // Always show newest fee structure assignments first (by fee_structure_id)

    // State for dropdown data
    const [classList, setClassList] = useState<any[]>([]);
    const [academicYearList, setAcademicYearList] = useState<any[]>([]);
    const [feeStructureList, setFeeStructureList] = useState<any[]>([]);

    // Fetch dropdown data
    useEffect(() => {
        async function fetchDropdowns() {
            try {
                const [classRes, yearRes, feeRes] = await Promise.all([
                    classService.list(),
                    academicYearService.list(),
                    feeStructureService.list(),
                ]);
                setClassList(classRes.data || classRes || []);
                setAcademicYearList(yearRes.data || yearRes || []);
                // Sort fee structures by id descending (newest first)
                const feeList = feeRes.data || feeRes || [];
                feeList.sort(function(a: any, b: any) { return (b.id || 0) - (a.id || 0); });
                setFeeStructureList(feeList);
            } catch (err) {
                setError("Failed to load dropdown data.");
            }
        }
        fetchDropdowns();
    }, []);

    // Helper to get name by id
    const getClassName = (id: number | string) => {
        const found = classList.find(c => c.id === id);
        return found ? found.name : `Class ${id}`;
    };
    const getFeeStructureName = (id: number | string) => {
        const found = feeStructureList.find(f => f.id == id);
        return found ? found.fee_category_id : '';
    };
    const getAcademicYearName = (value: number | string | { id?: number | string; name?: string }) => {
        // Try to match by id (number or string, loose equality)
        let found = academicYearList.find(y => y.id == value || y.name == value);
        if (found) return found.name;
        // If value looks like a year string, return as is
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}$/)) return value;
        return value || "-";
    };
    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await classFeeStructureAssignmentService.list({
                search: search || undefined,
                page: page + 1,
                limit: rowsPerPage,
            });
            // Only map if dropdowns are loaded
            let mapped = data.items.map((item: any) => {
                // Try all possible keys for academic year
                const classId = item.class_id ?? item.classId;
                const feeId = item.fee_structure_id ?? item.feeStructureId;
                const yearId = item.academic_year_id ?? item.academicYearId;
                const yearName = item.academic_year ?? item.academicYear;
                let academicYearValue = yearId ?? yearName;
                // If it's an object, try id or name
                if (academicYearValue && typeof academicYearValue === 'object') {
                    academicYearValue = academicYearValue.id ?? academicYearValue.name;
                }
                return {
                    ...item,
                    class_name: getClassName(classId),
                    fee_structure_name: getFeeStructureName(feeId),
                    academic_year: getAcademicYearName(academicYearValue),
                };
            });
            // Sort by createdAt descending (newest to oldest)
            mapped = mapped.sort(function(a: any, b: any) {
                const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
                const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
                return dateB - dateA;
            });
            setAssignments(mapped);
            setTotalAssignments(data.total);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch assignments.");
        } finally {
            setLoading(false);
        }
    }, [search, page, rowsPerPage, classList, academicYearList, feeStructureList]);

    // When page, search, or sort changes, fetch assignments
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAssignments();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchAssignments]);

    // Listen for navigation from AddClassFeeStructureAssignment and reset to first page if needed
    useEffect(() => {
        // If redirected from add page, always show first page
        // Use history.state for navigation state (window.history.state)
        if ((window.history.state && window.history.state.usr && window.history.state.usr.newlyCreated)) {
            setPage(0);
        }
    }, []);

    const handleDeactivateClick = (assignment: ClassFeeStructureAssignment) => {
        setAssignmentToDeactivate(assignment);
        setConfirmDialogOpen(true);
    };

    const handleConfirmDeactivate = async () => {
        if (!assignmentToDeactivate) return;
        try {
            setDeactivateLoading(true);
            await classFeeStructureAssignmentService.deactivate(assignmentToDeactivate.id);
            setConfirmDialogOpen(false);
            setAssignmentToDeactivate(null);
            showSuccessToast("Fee structure assignment deactivated successfully");
            fetchAssignments();
        } catch (err: any) {
            setError(err?.message || "Failed to deactivate assignment.");
        } finally {
            setDeactivateLoading(false);
        }
    };

    const assignmentColumns = useMemo(
        () => [
            { id: "academic_year", label: "Academic Year", field: "academic_year" },
            { id: "class_name", label: "Class", field: "class_name" },
            { id: "fee_structure_name", label: "Fee Structure", field: "fee_structure_name" },
            {
                id: "status",
                label: "Status",
                render: (row: ClassFeeStructureAssignment) => (
                    <StatusChip status={row.status?.toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE"} />
                )
            },
            {
                id: "actions",
                label: "Actions",
                render: (row: ClassFeeStructureAssignment) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="Edit">
                            <IconButton size="small" sx={{ color: '#757575' }} onClick={() => navigate(`/fees/edit/${row.id}`)}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                            <IconButton size="small" sx={{ color: '#757575' }} onClick={() => handleDeactivateClick(row)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.79 3.29C14.42 2.9 13.89 2.9 13.5 3.29L12.5 4.29C12.11 4.68 11.58 4.68 11.21 4.29L10.21 3.29C9.82 2.9 9.29 2.9 8.91 3.29L8.21 4H5C4.45 4 4 4.45 4 5C4 5.55 4.45 6 5 6H19C19.55 6 20 5.55 20 5C20 4.45 19.55 4 19 4Z" fill="currentColor"/>
                                </svg>
                            </IconButton>
                        </Tooltip>
                    </Box>
                )
            }
        ],
        [navigate]
    );

    const rangeStart = totalAssignments > 0 ? Math.min(page * rowsPerPage + 1, totalAssignments) : 0;
    const rangeEnd = Math.min((page + 1) * rowsPerPage, totalAssignments);

    return (
        <ListPageLayout
            header={
                <>
                    <PageHeader
                        title="Assign Fee Structure to Class"
                        onBack={() => navigate("/")}
                        backIcon={<HomeIcon sx={{ fontSize: 24 }} />}
                        actions={
                            <ListPageToolbar
                                searchValue={search}
                                onSearchChange={setSearch}
                                searchPlaceholder="Search by class or fee structure"
                                onAddClick={() => navigate("/fees/create")}
                                addLabel="Assign Fee Structure"
                            />
                        }
                    />
                    {error && (
                        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                </>
            }
        >
            {!loading && totalAssignments > 0 && (
                <DirectoryInfoBar
                    label="Fees"
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    total={totalAssignments}
                />
            )}
            <DataTable<ClassFeeStructureAssignment & Record<string, unknown>>
                columns={assignmentColumns}
                data={assignments as (ClassFeeStructureAssignment & Record<string, unknown>)[]}
                loading={loading}
                emptyMessage="No assignments available."
                stickyHeader
                size="small"
            />
            {!loading && totalAssignments > 0 && (
                <TablePaginationBar
                    page={page}
                    rowsPerPage={rowsPerPage}
                    totalRows={totalAssignments}
                    onPageChange={setPage}
                    onRowsPerPageChange={(v) => {
                        setRowsPerPage(v);
                        setPage(0);
                    }}
                />
            )}



            <ConfirmDialog
                open={confirmDialogOpen}
                title="Please Confirm"
                message={`Are you sure you want to deactivate this assignment?`}
                confirmText={deactivateLoading ? "Deactivating..." : "Confirm"}
                onConfirm={handleConfirmDeactivate}
                onCancel={() => setConfirmDialogOpen(false)}
                loading={deactivateLoading}
            />

            <Snackbar
                open={!!snackbar}
                autoHideDuration={3000}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                onClose={() => setSnackbar(null)}
            >
                <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: "100%" }}>
                    {snackbar}
                </Alert>
            </Snackbar>
        </ListPageLayout>
    );
};

export default ClassFeeStructureAssignmentList;
