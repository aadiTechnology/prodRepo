import { useState, useEffect, useMemo } from "react";
import { subjectService, type SubjectResponse } from "../api/services/subjectService";
import { classService, academicYearService } from "../api/services/dropdownServices";
import { type SubjectClassRow } from "../pages/academics/SubjectList.listConfig";

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
    const [academicYearFilter, setAcademicYearFilter] = useState("all");

    const [classOptions, setClassOptions] = useState<{ label: string; value: string }[]>([]);
    const [academicYearOptions, setAcademicYearOptions] = useState<{ label: string; value: string }[]>([]);

    // Delete Modal
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<SubjectResponse | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Load filter options
    useEffect(() => {
        // Load class options
        classService.list()
            .then((classes: any[]) => {
                setClassOptions([
                    { label: "Select Class", value: "all" },
                    ...classes
                        .filter((c: any) => c.is_active && !c.is_deleted)
                        .map((c: any) => ({ label: c.name, value: String(c.id) })),
                ]);
            })
            .catch(() => { });

        // Load academic year options
        academicYearService.list()
            .then((years: any[]) => {
                setAcademicYearOptions([
                    { label: "Academic Year", value: "all" },
                    ...years
                        .map((y: any) => ({ label: y.name || y.code, value: String(y.id) })),
                ]);
            })
            .catch(() => { });
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
                academic_year_id: academicYearFilter === "all" ? undefined : Number(academicYearFilter),
            });

            setSubjects(response.data);
            setTotalSubjects(response.total);
        } catch (err: any) {
            setError(err?.response?.data?.detail || "Unable to load subjects");
        } finally {
            setLoading(false);
        }
    };

    // Group subjects by academic year, class, AND subject_type - showing all subjects/codes in one row for same type
    const subjectRows: SubjectClassRow[] = useMemo(() => {
        const groupedMap = new Map<string, {
            subject_ids: number[];
            subject_names: string[];
            subject_codes: string[];
            subject_types: string[];
            academic_year_name: string;
            academic_year_id?: number;
            class_name: string;
            class_id?: number;
            subject_type: string; // Single type for this row
            is_active: boolean;
            is_mandatory: boolean;
        }>();

        subjects.forEach((subject) => {
            if (!subject.classes || subject.classes.length === 0) {
                // If no classes, use a default key based on subject_type
                const key = `no-class-${subject.subject_type}-${subject.id}`;
                groupedMap.set(key, {
                    subject_ids: [subject.id],
                    subject_names: [subject.name],
                    subject_codes: [subject.code],
                    subject_types: [subject.subject_type],
                    academic_year_name: "-",
                    class_name: "-",
                    subject_type: subject.subject_type,
                    is_active: subject.is_active,
                    is_mandatory: false,
                });
            } else {
                // Group by academic year, class, AND subject_type
                subject.classes.forEach((classMapping) => {
                    // Use IDs for the key to ensure consistent grouping even if names vary
                    const key = `${classMapping.academic_year_id || 'no-year'}-${classMapping.class_id || 'no-class'}-${subject.subject_type}`;
                    const existing = groupedMap.get(key);
                    if (existing) {
                        if (!existing.subject_ids.includes(subject.id)) {
                            existing.subject_ids.push(subject.id);
                            existing.subject_names.push(subject.name);
                            existing.subject_codes.push(subject.code);
                        }
                    } else {
                        groupedMap.set(key, {
                            subject_ids: [subject.id],
                            subject_names: [subject.name],
                            subject_codes: [subject.code],
                            subject_types: [subject.subject_type],
                            academic_year_name: classMapping.academic_year_name || "-",
                            academic_year_id: classMapping.academic_year_id,
                            class_name: classMapping.class_name || "-",
                            class_id: classMapping.class_id,
                            subject_type: subject.subject_type,
                            is_active: classMapping.is_active,
                            is_mandatory: classMapping.is_mandatory,
                        });
                    }
                });
            }
        });

        const rows: SubjectClassRow[] = Array.from(groupedMap.entries()).map(([key, group]) => ({
            id: key,
            subject_id: group.subject_ids[0], // Use first subject ID as a reference for edit/delete
            academic_year_id: group.academic_year_id,
            class_id: group.class_id,
            subject_name: group.subject_names.join(", "),
            subject_code: group.subject_codes.join(", "),
            subject_type: group.subject_type,
            subject_types: [group.subject_type],
            academic_year_name: group.academic_year_name,
            class_name: group.class_name,
            is_active: group.is_active,
            is_mandatory: group.is_mandatory,
        }));

        return rows;
    }, [subjects]);



    useEffect(() => {
        fetchSubjects();
    }, [page, rowsPerPage, search, statusFilter, classFilter, academicYearFilter]);

    useEffect(() => {
        setPage(0);
    }, [search, statusFilter, classFilter, academicYearFilter]);

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
            setError(err?.response?.data?.detail || "Unable to delete subject");
            setDeleteDialogOpen(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    return {
        subjects,
        subjectRows,
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
        academicYearFilter,
        setAcademicYearFilter,
        classOptions,
        academicYearOptions,
        deleteDialogOpen,
        setDeleteDialogOpen,
        selectedSubject,
        handleDeleteClick,
        handleConfirmDelete,
        deleteLoading,
        statusOptions: [
            { label: "Select Status", value: "all" },
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
        ],
    };
}

