import { useNavigate } from "react-router-dom";
import { Alert, Snackbar } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { PageHeader } from "../../components/layout";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../../components/reusable";
import { type SchoolClass } from "../../api/services/schoolClassService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useClassListController } from "../../hooks/useClassListController";
import { createClassListConfig } from "./ClassList.listConfig";

export default function ClassList() {
    const navigate = useNavigate();
    const controller = useClassListController();

    const listConfig = createClassListConfig({
        navigate,
        onDeleteClick: controller.handleDeleteClick,
    });

    return (
        <ListPageLayout
            pageBackground
            contentPaddingSize="none"
            header={
                <PageHeader
                    links={[{ title: "Classes", path: "#" }]}
                    homePath="/"
                    actions={
                        <ListPageToolbar
                            searchValue={controller.search}
                            onSearchChange={controller.setSearch}
                            searchPlaceholder="Search classes..."
                            filters={[
                                {
                                    label: "Academic Year",
                                    value: controller.academicYearFilter,
                                    onChange: controller.setAcademicYearFilter,
                                    options: controller.academicYearOptions,
                                },
                            ]}
                            onAddClick={() => navigate("/classes/new")}
                            addLabel="Add Class"
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

            <EntityTableSection<SchoolClass>
                label="Classes"
                totalRows={controller.totalClasses}
                page={controller.page}
                rowsPerPage={controller.rowsPerPage}
                onPageChange={controller.setPage}
                onRowsPerPageChange={controller.setRowsPerPage}
                columns={listConfig.columns}
                data={controller.classes}
                loading={controller.loading}
                emptyMessage={listConfig.uiPolicy.emptyMessage}
                rowActions={listConfig.actions.rowActions}
                stickyHeader
                size="small"
            />

            <ConfirmDialog
                open={controller.deleteDialogOpen}
                title="Delete Class?"
                message={`Are you sure you want to delete ${controller.selectedClass?.name}?`}
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
