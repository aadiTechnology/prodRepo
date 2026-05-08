import { useNavigate } from "react-router-dom";
import { Alert, Snackbar } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { PageHeader } from "../../components/layout";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../../components/reusable";
import { type SubjectResponse } from "../../api/services/subjectService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useSubjectListController } from "../../hooks/useSubjectListController";
import { createSubjectListConfig } from "./SubjectList.listConfig";

export default function SubjectList() {
    const navigate = useNavigate();
    const controller = useSubjectListController();

    const listConfig = createSubjectListConfig({
        navigate,
        onDeleteClick: controller.handleDeleteClick,
    });

    return (
        <ListPageLayout
            pageBackground
            contentPaddingSize="none"
            header={
                <PageHeader
                    links={[{ title: "Subjects", path: "#" }]}
                    homePath="/"
                    actions={
                        <ListPageToolbar
                            searchValue={controller.search}
                            onSearchChange={controller.setSearch}
                            searchPlaceholder="Search subjects by name or code..."
                            filters={[
                                {
                                    label: "Class",
                                    value: controller.classFilter,
                                    onChange: controller.setClassFilter,
                                    options: controller.classOptions,
                                },
                                {
                                    label: "Status",
                                    value: controller.statusFilter,
                                    onChange: controller.setStatusFilter,
                                    options: controller.statusOptions,
                                },
                            ]}
                            onAddClick={() => navigate("/subjects/new")}
                            addLabel="Add Subject"
                            addIcon={<AddIcon sx={{ fontSize: 24 }} />}
                        />
                    }
                />
            }
        >
            {controller.error && (
                <Alert severity="error" sx={{ m: 2 }} onClose={() => controller.setError?.(null)}>
                    {controller.error}
                </Alert>
            )}

            <EntityTableSection<SubjectResponse>
                label="Subjects"
                totalRows={controller.totalSubjects}
                page={controller.page}
                rowsPerPage={controller.rowsPerPage}
                onPageChange={controller.setPage}
                onRowsPerPageChange={controller.setRowsPerPage}
                columns={listConfig.columns}
                data={controller.subjects}
                loading={controller.loading}
                emptyMessage={listConfig.uiPolicy.emptyMessage}
                rowActions={listConfig.actions.rowActions}
                stickyHeader
                size="small"
            />

            <ConfirmDialog
                open={controller.deleteDialogOpen}
                title="Delete Subject?"
                message={`Are you sure you want to delete ${controller.selectedSubject?.name}?`}
                confirmText={controller.deleteLoading ? "Deleting..." : "Delete"}
                onConfirm={controller.handleConfirmDelete}
                onCancel={() => controller.setDeleteDialogOpen(false)}
                loading={controller.deleteLoading}
            />

            <Snackbar
                open={!!controller.success}
                autoHideDuration={3000}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                onClose={() => controller.setSuccess(null)}
            >
                <Alert onClose={() => controller.setSuccess(null)} severity="success" sx={{ width: "100%" }}>
                    {controller.success}
                </Alert>
            </Snackbar>
        </ListPageLayout>
    );
}
