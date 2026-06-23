import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Add as AddIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { PageHeader } from "../../components/layout";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../../components/reusable";
import { type SubjectResponse } from "../../api/services/subjectService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useSubjectListController } from "../../hooks/useSubjectListController";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import { createSubjectListConfig, type SubjectClassRow } from "./SubjectList.listConfig";

export default function SubjectList() {
    const navigate = useNavigate();
    const controller = useSubjectListController();
    const { enqueueSnackbar } = useSnackbar();
    const { buildListBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();

    useEffect(() => {
        if (!controller.success) return;
        enqueueSnackbar(controller.success, {
            variant: "success",
            autoHideDuration: 3000,
            anchorOrigin: { vertical: "top", horizontal: "center" },
        });
        controller.setSuccess(null);
    }, [controller.success, controller.setSuccess, enqueueSnackbar]);

    useEffect(() => {
        if (!controller.error) return;
        enqueueSnackbar(controller.error, {
            variant: "error",
            autoHideDuration: 4000,
            anchorOrigin: { vertical: "top", horizontal: "center" },
        });
        controller.setError(null);
    }, [controller.error, controller.setError, enqueueSnackbar]);

    const breadcrumbLinks = buildListBreadcrumbs("Subjects");

    const listConfig = createSubjectListConfig({
        navigate: navigateWithConfigHub,
        onDeleteClick: controller.handleDeleteClick,
    });

    return (
        <ListPageLayout
            pageBackground
            contentPaddingSize="none"
            header={
                <PageHeader
                    links={breadcrumbLinks}
                    homePath="/"
                    actions={
                        <ListPageToolbar
                            searchValue={controller.search}
                            onSearchChange={controller.setSearch}
                            searchPlaceholder="Search subjects by name or code..."
                            filters={[
                                {
                                    label: "Academic Year",
                                    value: controller.academicYearFilter,
                                    onChange: controller.setAcademicYearFilter,
                                    options: controller.academicYearOptions,
                                },
                                {
                                    label: "Select Class",
                                    value: controller.classFilter,
                                    onChange: controller.setClassFilter,
                                    options: controller.classOptions,
                                },
                                {
                                    label: "Select Status",
                                    value: controller.statusFilter,
                                    onChange: controller.setStatusFilter,
                                    options: controller.statusOptions,
                                },

                            ]}
                            onAddClick={() => navigateWithConfigHub("/subjects/new")}
                            addLabel="Add Subject"
                            addIcon={<AddIcon sx={{ fontSize: 24 }} />}
                        />
                    }
                />
            }
        >
            <EntityTableSection<SubjectClassRow>
                label="Subjects"
                totalRows={controller.totalSubjects}
                page={controller.page}
                rowsPerPage={controller.rowsPerPage}
                onPageChange={controller.setPage}
                onRowsPerPageChange={controller.setRowsPerPage}
                columns={listConfig.columns}
                data={controller.subjectRows}
                loading={controller.loading}
                emptyMessage={listConfig.uiPolicy.emptyMessage}
                rowActions={listConfig.actions.rowActions}
                stickyHeader
                size="small"
            />

            <ConfirmDialog
                open={controller.deleteDialogOpen}
                title="Delete Subject(s)?"
                message={`Are you sure you want to delete "${controller.selectedRow?.subject_name}"? This will permanently remove ${controller.selectedRow?.subject_ids?.length ?? 1} subject(s) from all assigned classes.`}
                confirmText={controller.deleteLoading ? "Deleting..." : "Delete"}
                onConfirm={controller.handleConfirmDelete}
                onCancel={() => controller.setDeleteDialogOpen(false)}
                loading={controller.deleteLoading}
            />

        </ListPageLayout>
    );
}
