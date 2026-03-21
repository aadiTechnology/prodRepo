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
import schoolClassService, { SchoolClass } from "../../api/services/schoolClassService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StatusChip from "../../components/roles/StatusChip";

const ClassList = () => {
    const navigate = useNavigate();

    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(0);
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const classData = await schoolClassService.getAll();
            setClasses(classData);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch classes.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEdit = (item: SchoolClass) => {
        navigate(`/classes/${item.id}/edit`);
    };

    const handleDeleteClick = (item: SchoolClass) => {
        setSelectedClass(item);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedClass) return;
        try {
            setDeleteLoading(true);
            setError(null);
            await schoolClassService.softDelete(selectedClass.id);
            setDeleteDialogOpen(false);
            setSelectedClass(null);
            setSuccess("Class deleted successfully!");
            await fetchData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || "Failed to delete class.");
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredClasses = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return classes;
        return classes.filter((item) =>
            `${item.name || ""}`.toLowerCase().includes(q) ||
            `${item.section || ""}`.toLowerCase().includes(q)
        );
    }, [classes, search]);

    const sortedClasses = useMemo(() => {
        return [...filteredClasses].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    }, [filteredClasses]);

    const paginatedClasses = useMemo(() => {
        const start = page * rowsPerPage;
        return sortedClasses.slice(start, start + rowsPerPage);
    }, [sortedClasses, page, rowsPerPage]);

    const totalRecords = filteredClasses.length;
    const rangeStart = totalRecords > 0 ? page * rowsPerPage + 1 : 0;
    const rangeEnd = Math.min((page + 1) * rowsPerPage, totalRecords);

    const columns = useMemo<DataTableColumn<SchoolClass>[]>(
        () => [
            { id: "name", label: "Class Name", field: "name" },
            {
                id: "section",
                label: "Section",
                align: "center",
                render: (row: SchoolClass) => row.section || "-",
            },
            {
                id: "capacity",
                label: "Capacity",
                align: "center",
                render: (row: SchoolClass) => row.capacity ?? "-",
            },
            {
                id: "status",
                label: "Status",
                align: "center",
                render: (row: SchoolClass) => <StatusChip status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
            },
        ],
        []
    );

    return (
        <ListPageLayout
            header={
                <PageHeader
                    links={[{ title: "Classes", path: "#" }]}
                    homePath="/"
                    actions={
                        <ListPageToolbar
                            searchValue={search}
                            onSearchChange={handleSearchChange}
                            searchPlaceholder="Search classes..."
                            onAddClick={() => navigate("/classes/new")}
                            addLabel="Add Class"
                        />
                    }
                />
            }
        >
            {error && (
                <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", bgcolor: "error.light", mb: 2 }}>
                    <Typography color="error.main">{error}</Typography>
                    <Button size="small" variant="outlined" color="error" onClick={fetchData}>
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
                        label="Classes"
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        total={totalRecords}
                    />
                    <DataTable<SchoolClass>
                        columns={columns}
                        data={paginatedClasses}
                        emptyMessage="No classes found. Click 'Add Class' to begin."
                        renderRowActions={(item) => (
                            <TableRowActions
                                onEdit={() => handleEdit(item)}
                                onDelete={() => handleDeleteClick(item)}
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
                title="Delete Class?"
                message={`Are you sure you want to delete ${selectedClass?.name}?`}
                confirmText={deleteLoading ? "Deleting..." : "Delete"}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                loading={deleteLoading}
            />
        </ListPageLayout>
    );
};

export default ClassList;
