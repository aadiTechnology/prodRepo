import { useEffect } from "react";
import { Add as AddIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { PageHeader } from "../../components/layout";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../../components/reusable";
import { type SchoolClass } from "../../api/services/schoolClassService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useClassListController } from "../../hooks/useClassListController";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import { createClassListConfig } from "./ClassList.listConfig";

export default function ClassList() {
    const controller = useClassListController();
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
        </ListPageLayout>
    );
}
