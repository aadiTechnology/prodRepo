import { useNavigate } from "react-router-dom";
import { Alert, Snackbar } from "../../components/primitives";
import { Add as AddIcon } from "@mui/icons-material";
import { PageHeader } from "../../components/layout";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../../components/reusable";
import { type SchoolClass } from "../../api/services/schoolClassService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useClassListController } from "../../hooks/useClassListController";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import { createClassListConfig } from "./ClassList.listConfig";

export default function ClassList() {
    const navigate = useNavigate();
    const controller = useClassListController();
    const { buildListBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();

    const breadcrumbLinks = buildListBreadcrumbs("Classes");

    const listConfig = createClassListConfig({
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
                            searchPlaceholder="Search classes..."
                            filters={[
                                {
                                    label: "Academic Year",
                                    value: controller.academicYearFilter,
                                    onChange: controller.setAcademicYearFilter,
                                    options: controller.academicYearOptions,
                                },
                            ]}
                            onAddClick={() => navigateWithConfigHub("/classes/new")}
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
                showInfoBar={false}
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
                title="Please Confirm"
                message="Are you sure you want to delete this class?"
                confirmText={controller.deleteLoading ? "Deleting…" : "Confirm"}
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
                <Alert
                    onClose={() => controller.setSuccess(null)}
                    severity="success"
                    variant="filled"
                    sx={{ width: "100%", borderRadius: "12px" }}
                >
                    {controller.success}
                </Alert>
            </Snackbar>
        </ListPageLayout>
    );
}
