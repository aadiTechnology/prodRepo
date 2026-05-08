import { useState, useEffect } from "react";
import { subjectService, type SubjectResponse } from "../api/services/subjectService";
import { classService } from "../api/services/dropdownServices";

export function useSubjectListController() {
    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalSubjects, setTotalSubjects] = useState(0);

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [classFilter, setClassFilter] = useState("all");
    const [classOptions, setClassOptions] = useState<{ label: string; value: string }[]>([]);

    // Delete Modal
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<SubjectResponse | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Load class options for filter dropdown
    useEffect(() => {
        classService.list()
            .then((classes: any[]) => {
                setClassOptions([
                    { label: "All Classes", value: "all" },
                    ...classes
                        .filter((c: any) => c.is_active && !c.is_deleted)
                        .map((c: any) => ({ label: c.name, value: String(c.id) })),
                ]);
            })
            .catch(() => {
                // non-critical — filter just won't populate
            });
    }, []);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await subjectService.getSubjects({
                skip: page * rowsPerPage,
                limit: rowsPerPage,
                search: search || undefined,
                is_active: statusFilter === "all" ? undefined : statusFilter === "active",
                class_id: classFilter === "all" ? undefined : Number(classFilter),
            });

            setSubjects(response.data);
            setTotalSubjects(response.total);
        } catch (err: any) {
            setError(err?.response?.data?.detail || "Unable to load subjects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, [page, rowsPerPage, search, statusFilter, classFilter]);

    // Reset to page 0 whenever filters change
    useEffect(() => {
        setPage(0);
    }, [search, statusFilter, classFilter]);

    const handleDeleteClick = (subject: SubjectResponse) => {
        setSelectedSubject(subject);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedSubject) return;
        try {
            setDeleteLoading(true);
            await subjectService.deleteSubject(selectedSubject.id);
            setSuccess("Subject deleted successfully");
            setDeleteDialogOpen(false);
            fetchSubjects();
        } catch (err: any) {
            // Surface the exact backend message (e.g., "already mapped" restriction)
            setError(err?.response?.data?.detail || "Unable to delete subject");
            setDeleteDialogOpen(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    return {
        subjects,
        loading,
        error,
        setError,
        success,
        setSuccess,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        totalSubjects,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        classFilter,
        setClassFilter,
        classOptions,
        deleteDialogOpen,
        setDeleteDialogOpen,
        selectedSubject,
        handleDeleteClick,
        handleConfirmDelete,
        deleteLoading,
        statusOptions: [
            { label: "All Statuses", value: "all" },
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
        ],
    };
}
