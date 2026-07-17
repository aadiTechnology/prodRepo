import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import { subjectService } from "../api/services/subjectService";
import { classService, academicYearService } from "../api/services/dropdownServices";
import { type SubjectClassRow } from "../pages/academics/SubjectList.listConfig";
import { formatClassDisplayLabel } from "../utils/formatters";

const resolveCurrentAcademicYearId = (
    years: { id: number; is_current?: boolean | number; is_active?: boolean | number }[]
): string => {
    const current =
        years.find((y) => y.is_current === true || y.is_current === 1) ??
        years.find((y) => y.is_active === true || y.is_active === 1) ??
        years[0];
    return current?.id != null ? String(current.id) : "";
};

export function useSubjectListController() {
    const location = useLocation();
    const locationYearId = (location.state as { academic_year_id?: number } | null)?.academic_year_id;
    const listRefreshAt = (location.state as { subjectListRefreshAt?: number } | null)?.subjectListRefreshAt;

    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
    const [totalSubjects, setTotalSubjects] = useState(0);

    // Filters — default All so Active + Inactive both visible (homework still excludes inactive).
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [academicYearFilter, setAcademicYearFilter] = useState(
        locationYearId != null ? String(locationYearId) : "",
    );
    const [academicYearFilterReady, setAcademicYearFilterReady] = useState(false);

    const [classOptions, setClassOptions] = useState<{ label: string; value: string }[]>([]);
    const [academicYearOptions, setAcademicYearOptions] = useState<{ label: string; value: string }[]>([]);

    // Delete Modal
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<SubjectClassRow | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Load filter options
    useEffect(() => {
        // Load class options
        classService.list()
            .then((classes: any[]) => {
                setClassOptions(
                    classes
                        .filter((c: any) => c.is_active && !c.is_deleted)
                        .map((c: any) => ({
                            label: formatClassDisplayLabel(c.name) || String(c.id),
                            value: String(c.id),
                        })),
                );
            })
            .catch(() => { });

        // Load academic year options
        academicYearService.list()
            .then((data: unknown) => {
                const yearsRaw =
                    (Array.isArray(data) ? data : (data as { data?: unknown[] })?.data) ?? [];
                const years = yearsRaw as {
                    id: number;
                    name?: string;
                    code?: string;
                    is_current?: boolean | number;
                    is_active?: boolean | number;
                }[];
                setAcademicYearOptions(
                    years.map((y) => ({ label: y.name || y.code || String(y.id), value: String(y.id) })),
                );
                setAcademicYearFilter((prev) => {
                    if (locationYearId != null) return String(locationYearId);
                    return prev || resolveCurrentAcademicYearId(years);
                });
            })
            .catch(() => { })
            .finally(() => {
                setAcademicYearFilterReady(true);
            });
    }, [locationYearId]);

    // After Edit Subject save, apply the saved year filter and refresh
    useEffect(() => {
        if (locationYearId == null) return;
        setAcademicYearFilter(String(locationYearId));
        setPage(0);
    }, [locationYearId, listRefreshAt]);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await subjectService.getSubjects({
                skip: page * rowsPerPage,
                limit: rowsPerPage,
                search: search || undefined,
                is_active: statusFilter === "" ? undefined : statusFilter === "active",
                class_id: classFilter === "" ? undefined : Number(classFilter),
                academic_year_id: academicYearFilter === "" ? undefined : Number(academicYearFilter),
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
    const academicYearNameById = useMemo(
        () => Object.fromEntries(academicYearOptions.map((option) => [option.value, option.label])),
        [academicYearOptions],
    );

    const resolveAcademicYearName = useCallback(
        (classMapping: { academic_year_id?: number; academic_year_name?: string | null }) => {
            if (classMapping.academic_year_name) {
                return classMapping.academic_year_name;
            }
            if (classMapping.academic_year_id != null) {
                return academicYearNameById[String(classMapping.academic_year_id)] || "-";
            }
            if (academicYearFilter) {
                return academicYearNameById[academicYearFilter] || "-";
            }
            return "-";
        },
        [academicYearNameById, academicYearFilter],
    );

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
            // When year/class filter is on, skip subjects with no mapping for that filter
            // (avoids ghost rows with Academic Year "-" / Class "-").
            if (!subject.classes || subject.classes.length === 0) {
                if (academicYearFilter || classFilter) {
                    return;
                }
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
                subject.classes.forEach((classMapping: any) => {
                    // Use IDs for the key to ensure consistent grouping even if names vary
                    const key = `${classMapping.academic_year_id || 'no-year'}-${classMapping.class_id || 'no-class'}-${subject.subject_type}`;
                    const existing = groupedMap.get(key);
                    if (existing) {
                        if (!existing.subject_ids.includes(subject.id)) {
                            existing.subject_ids.push(subject.id);
                            existing.subject_names.push(subject.name);
                            existing.subject_codes.push(subject.code);
                            existing.is_active = existing.is_active && Boolean(subject.is_active);
                        }
                    } else {
                        groupedMap.set(key, {
                            subject_ids: [subject.id],
                            subject_names: [subject.name],
                            subject_codes: [subject.code],
                            subject_types: [subject.subject_type],
                            academic_year_name: resolveAcademicYearName(classMapping),
                            academic_year_id: classMapping.academic_year_id,
                            class_name: classMapping.class_name || "-",
                            class_id: classMapping.class_id,
                            subject_type: subject.subject_type,
                            is_active: Boolean(subject.is_active),
                            is_mandatory: classMapping.is_mandatory,
                        });
                    }
                });
            }
        });

        const rows: SubjectClassRow[] = Array.from(groupedMap.entries()).map(([key, group]) => ({
            id: key,
            subject_id: group.subject_ids[0], // first subject ID used for edit navigation
            subject_ids: group.subject_ids,   // ALL subject IDs used for delete
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
    }, [subjects, resolveAcademicYearName, academicYearFilter, classFilter]);



    useEffect(() => {
        if (!academicYearFilterReady) return;
        fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, search, statusFilter, classFilter, academicYearFilter, academicYearFilterReady, listRefreshAt]);

    useEffect(() => {
        setPage(0);
    }, [search, statusFilter, classFilter, academicYearFilter]);

    const handleDeleteClick = (row: SubjectClassRow) => {
        setSelectedRow(row);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedRow) return;
        try {
            setDeleteLoading(true);
            // Delete ALL subjects in this grouped row
            for (const id of selectedRow.subject_ids) {
                await subjectService.deleteSubject(id);
            }
            setSuccess(`${selectedRow.subject_ids.length} subject(s) deleted successfully`);
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
        selectedRow,
        handleDeleteClick,
        handleConfirmDelete,
        deleteLoading,
        statusOptions: [
            { label: "All", value: "" },
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
        ],
    };
}

