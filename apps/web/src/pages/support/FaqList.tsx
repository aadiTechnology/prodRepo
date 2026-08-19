import { useMemo, useState } from "react";
import { Alert, Box, IconButton, TextField, Typography } from "@mui/material";
import { Add as AddIcon, Cancel as CancelIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { PageHeader } from "../../components/layout";
import { AppCard, Dialog } from "../../components/primitives";
import {
  EntityTableSection,
  ListPageLayout,
  ListPageToolbar,
} from "../../components/reusable";
import type { DataTableColumn } from "../../components/reusable/DataTable";
import TableRowActions from "../../components/reusable/TableRowActions";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { CancelButton, SaveButton } from "../../components/semantic";
import { colorTokens } from "../../tokens/colors";
import { useSupportPermissions } from "../../hooks/useSupportPermissions";
import { useFaqData } from "./context/FaqDataContext";
import { SUPPORT_SUCCESS_SNACKBAR_OPTIONS, type SupportCategory } from "./support.types";

type CategoryDialogMode = "add" | "edit";

const REQUIRED_ASTERISK_SX = {
  "& .MuiFormLabel-asterisk": { color: "error.main" },
  "& .MuiInputLabel-asterisk": { color: "error.main" },
} as const;

const CATEGORY_MODAL_PAPER_SX = {
  borderRadius: 3,
  maxWidth: 420,
  width: "calc(100% - 32px)",
  p: 0,
  m: 2,
  overflow: "hidden",
} as const;

export default function FaqList() {
  const { enqueueSnackbar } = useSnackbar();
  const perms = useSupportPermissions();
  const { categories, addSupportCategory, updateSupportCategory, deleteSupportCategory } =
    useFaqData();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<CategoryDialogMode>("add");
  const [editingCategory, setEditingCategory] = useState<SupportCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SupportCategory | null>(null);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = categories.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!term) return sorted;
    return sorted.filter((category) => category.name.toLowerCase().includes(term));
  }, [categories, search]);

  const paginatedCategories = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredCategories.slice(start, start + rowsPerPage);
  }, [filteredCategories, page, rowsPerPage]);

  const openAddDialog = () => {
    setDialogMode("add");
    setEditingCategory(null);
    setCategoryName("");
    setCategoryError(null);
    setAttempted(false);
    setDialogOpen(true);
  };

  const openEditDialog = (category: SupportCategory) => {
    setDialogMode("edit");
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryError(null);
    setAttempted(false);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setCategoryName("");
    setCategoryError(null);
    setAttempted(false);
  };

  const saveCategory = () => {
    setAttempted(true);
    const result =
      dialogMode === "add"
        ? addSupportCategory(categoryName)
        : editingCategory
          ? updateSupportCategory(editingCategory.id, categoryName)
          : { ok: false as const, error: "Category not found." };

    if (!result.ok) {
      setCategoryError(result.error);
      return;
    }

    enqueueSnackbar(
      dialogMode === "add" ? "Category added successfully." : "Category updated successfully.",
      SUPPORT_SUCCESS_SNACKBAR_OPTIONS
    );
    closeDialog();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteSupportCategory(deleteTarget.id);
    enqueueSnackbar("Category deleted successfully.", SUPPORT_SUCCESS_SNACKBAR_OPTIONS);
    setDeleteTarget(null);
  };

  const columns = useMemo<DataTableColumn<SupportCategory>[]>(
    () => [
      {
        id: "name",
        label: "Category Name",
        render: (row) => row.name,
      },
      {
        id: "actions",
        label: "Action",
        align: "center",
        headerAlign: "center",
        render: (row) => (
          <TableRowActions
            onEdit={() => openEditDialog(row)}
            onDelete={() => setDeleteTarget(row)}
            editTestId={`support-category-edit-${row.id}`}
            deleteTestId={`support-category-delete-${row.id}`}
          />
        ),
      },
    ],
    []
  );

  if (!perms.isSuperAdmin) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-support-categories-denied">
        <Alert severity="warning">Access Denied</Alert>
      </Box>
    );
  }

  const dialogTitle = dialogMode === "add" ? "Add Category" : "Edit Category";

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[
            { title: "My Queries", path: "/support/contact" },
            { title: "Add Categories", path: "/support/contact/categories" },
          ]}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(0);
              }}
              searchPlaceholder="Search category…"
              searchTestId="input-support-category-search"
              onAddClick={openAddDialog}
              addLabel="Add Category"
              addIcon={<AddIcon sx={{ fontSize: 24 }} />}
              addButtonTestId="support-category-add"
            />
          }
        />
      }
    >
      <Box data-testid="support-category-list">
        <AppCard
          paddingSize="none"
          sx={{
            borderRadius: "14px",
            border: `1px solid ${colorTokens.border.default}`,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
            overflow: "hidden",
          }}
        >
          <EntityTableSection<SupportCategory>
            label=""
            showInfoBar={false}
            totalRows={filteredCategories.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(0);
            }}
            columns={columns}
            data={paginatedCategories}
            loading={false}
            emptyMessage="No categories configured."
            emptyTestId="empty-support-categories"
            getRowKey={(row) => row.id}
            stickyHeader
            size="small"
            showPagination={filteredCategories.length > 0}
            data-testid="table-support-categories"
            rowTestId={(row) => `support-category-row-${row.id}`}
          />
        </AppCard>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
          closeDialog();
        }}
        disableRestoreFocus
        data-testid="dialog-support-category"
        PaperProps={{ sx: CATEGORY_MODAL_PAPER_SX }}
      >
        <Box
          sx={(theme) => ({
            background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            px: 2,
            py: 1,
            minHeight: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            boxShadow: theme.shadows[2],
          })}
        >
          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.2 }}>
            {dialogTitle}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={closeDialog}
            data-testid="btn-close-support-category-dialog"
            sx={{ color: "white", bgcolor: "transparent", borderRadius: 2 }}
          >
            <CancelIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </Box>

        <Box
          sx={(theme) => ({
            px: 3,
            pt: 2.5,
            pb: 2,
            bgcolor: theme.palette.background.paper,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          })}
        >
          <TextField
            autoFocus
            fullWidth
            required
            label="Category Name"
            value={categoryName}
            onChange={(e) => {
              setCategoryName(e.target.value);
              if (categoryError) setCategoryError(null);
            }}
            error={attempted && Boolean(categoryError)}
            helperText={attempted ? categoryError : undefined}
            inputProps={{ "data-testid": "support-category-name" }}
            sx={REQUIRED_ASTERISK_SX}
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1.5,
              mt: 2.5,
              pt: 1.5,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <CancelButton onClick={closeDialog} data-testid="support-category-cancel">
              Cancel
            </CancelButton>
            <SaveButton onClick={saveCategory} data-testid="support-category-save">
              Save
            </SaveButton>
          </Box>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Category"
        message="Are you sure you want to delete this category?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
        data-testid="support-category-delete-confirmation"
      />
    </ListPageLayout>
  );
}
