/**
 * Academic Year List Page - Display and manage academic years
 * Provides listing, search, and CRUD operations for academic years
 * Integrates RBAC for academic management permissions
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout";
import {
    ListPageLayout,
    ListPageToolbar,
    DirectoryInfoBar,
    DataTable,
    TableRowActions,
    TablePaginationBar,
    type DataTableColumn,
} from "../../components/reusable";
import { Box, Typography, Button, CircularProgress } from "../../components/primitives";
import academicYearService, { AcademicYear } from "../../api/services/academicYearService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StatusChip from "../../components/roles/StatusChip";

// ═══════════════════════════════════════════════════════════════════════════
// Academic Year List Page Component
// ═══════════════════════════════════════════════════════════════════════════
const AcademicYearList = () => {
    const navigate = useNavigate();

    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(0);
    };

    const formatDate = (value: string) => {
        if (!value) return "-";
        return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    };

    const fetchAcademicYears = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await academicYearService.getAll();
            setAcademicYears(data);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch academic years.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAcademicYears();
    }, [fetchAcademicYears]);

    const handleEdit = (year: AcademicYear) => {
        navigate(`/academic-years/${year.id}/edit`);
    };

    const handleDeleteClick = (year: AcademicYear) => {
        setSelectedYear(year);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedYear) return;
        try {
            setDeleteLoading(true);
            setError(null);
            await academicYearService.softDelete(selectedYear.id);
            setDeleteDialogOpen(false);
            setSelectedYear(null);
            setSuccess("Academic year deleted successfully!");
            fetchAcademicYears();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || "Failed to delete academic year.");
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredYears = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return academicYears;
        return academicYears.filter((year) =>
            `${year.name || ""}`.toLowerCase().includes(q) ||
            `${year.code || ""}`.toLowerCase().includes(q)
        );
    }, [academicYears, search]);

    const sortedYears = useMemo(() => {
        return [...filteredYears].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    }, [filteredYears]);

    const paginatedYears = useMemo(() => {
        const start = page * rowsPerPage;
        return sortedYears.slice(start, start + rowsPerPage);
    }, [sortedYears, page, rowsPerPage]);
    const totalRecords = filteredYears.length;
    const rangeStart = totalRecords > 0 ? page * rowsPerPage + 1 : 0;
    const rangeEnd = Math.min((page + 1) * rowsPerPage, totalRecords);

    const columns = useMemo<DataTableColumn<AcademicYear>[]>(
        () => [
            { id: "name", label: "Academic Year", field: "name" },
            { id: "code", label: "Code", field: "code" },
            {
                id: "start_date",
                label: "Start Date",
                render: (row: AcademicYear) => formatDate(row.start_date),
            },
            {
                id: "end_date",
                label: "End Date",
                render: (row: AcademicYear) => formatDate(row.end_date),
            },
            {
                id: "status",
                label: "Status",
                align: "center",
                render: (row: AcademicYear) => <StatusChip status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
            },
        ],
        []
    );

    return (
        <ListPageLayout
            header={
                <PageHeader
                    links={[{ title: "Academic Years", path: "#" }]}
                    homePath="/"
                    actions={
                        <ListPageToolbar
                            searchValue={search}
                            onSearchChange={handleSearchChange}
                            searchPlaceholder="Search academic years..."
                            onAddClick={() => navigate("/academic-years/new")}
                            addLabel="Add Academic Year"
                        />
                    }
                />
            }
        >
            {error && (
                <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", bgcolor: "error.light", mb: 2 }}>
                    <Typography color="error.main">{error}</Typography>
                    <Button size="small" variant="outlined" color="error" onClick={fetchAcademicYears}>
                        Retry
                    </Button>
                </Box>
            )}
            {success && (
                <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", bgcolor: "success.light", mb: 2 }}>
                    <Typography color="success.main">{success}</Typography>
                    <Button size="small" variant="outlined" color="success" onClick={() => setSuccess(null)}>
                        Dismiss
                    </Button>
                </Box>
            )}

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <DirectoryInfoBar
                        label="Academic Years"
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        total={totalRecords}
                    />
                    <DataTable<AcademicYear>
                        columns={columns}
                        data={paginatedYears}
                        emptyMessage="No academic years found. Click 'Add Academic Year' to begin."
                        renderRowActions={(year) => (
                            <TableRowActions
                                onEdit={() => handleEdit(year)}
                                onDelete={() => handleDeleteClick(year)}
                            />
                        )}
                    />
                    <TablePaginationBar
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalRows={totalRecords}
                        onPageChange={setPage}
                        onRowsPerPageChange={(value) => {
                            setRowsPerPage(value);
                            setPage(0);
                        }}
                    />
                </>
            )}

            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete Academic Year?"
                message={`Are you sure you want to delete ${selectedYear?.name}?`}
                confirmText={deleteLoading ? "Deleting..." : "Delete"}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                loading={deleteLoading}
            />
        </ListPageLayout>
    );
};

export default AcademicYearList;
