import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getFeeCategories, deleteFeeCategory } from '../../api/services/feeService';
import type { FeeCategoryResponse } from '../../types/fee';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ListPageLayout, ListPageToolbar, DirectoryInfoBar, DataTable, TableRowActions, TablePaginationBar } from '../../components/reusable';
import type { DataTableColumn } from '../../components/reusable';
import PageHeader from '../../components/layout/PageHeader';
import StatusChip from '../../components/roles/StatusChip';
import { Home as HomeIcon } from '@mui/icons-material';
// ...existing code...

const FeeCategoryManagement = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<FeeCategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCategories, setTotalCategories] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<FeeCategoryResponse | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<FeeCategoryResponse | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // --- Success Toast Handler ---
  const showSuccessToast = (message: string) => setSnackbar(message);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFeeCategories();
      setCategories(data || []);
      setTotalCategories((data || []).length);
    } catch (err: any) {
      setError(err?.message || err?.detail || "Failed to fetch categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAdd = () => {
    navigate("/fees/categories/add");
  };

  const handleEdit = (category: FeeCategoryResponse) => {
    navigate(`/fees/categories/edit/${category.id}`);
  };

  const handleDeleteClick = (category: FeeCategoryResponse) => {
    setCategoryToDelete(category);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteFeeCategory(categoryToDelete.id);
      setConfirmDialogOpen(false);
      setCategoryToDelete(null);
      showSuccessToast("Fee category deleted successfully");
      fetchCategories();
    } catch (err: any) {
      setError(err?.message || err?.detail || "Failed to delete category.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered and paginated categories
  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      (cat.code || "").toLowerCase().includes(search.toLowerCase()) ||
      String(cat.id).includes(search)
  );
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    let aVal: any = a.name;
    let bVal: any = b.name;
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
  const paginatedCategories = sortedCategories.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const rangeStart = filteredCategories.length > 0 ? Math.min(page * rowsPerPage + 1, filteredCategories.length) : 0;
  const rangeEnd = Math.min((page + 1) * rowsPerPage, filteredCategories.length);

  // Columns for DataTable
  const categoryColumns: DataTableColumn<FeeCategoryResponse & Record<string, unknown>>[] = useMemo(
    () => [
      {
        id: "name",
        label: "Name",
        field: "name",
        align: "left",
      },
      {
        id: "status",
        label: "Status",
        render: (cat: FeeCategoryResponse) => <StatusChip status={cat.status ? "ACTIVE" : "INACTIVE"} />,
        align: "center",
      },
    ],
    []
  );

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            title="Fee Category Management"
            onBack={() => navigate("/")}
            backIcon={<HomeIcon sx={{ fontSize: 24 }} />}
            actions={
              <ListPageToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search Category"
                onAddClick={handleAdd}
                addLabel="Add Category"
              />
            }
          />
          {error && (
            <Alert severity="error" sx={{ m: 1, borderRadius: 2, py: 0.5 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </>
      }
      pageBackground={true}
    >
      {!loading && filteredCategories.length > 0 && (
        <DirectoryInfoBar
          label="Fee Category Directory"
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={filteredCategories.length}
        />
      )}
      <DataTable<FeeCategoryResponse & Record<string, unknown>>
        columns={categoryColumns}
        data={paginatedCategories as (FeeCategoryResponse & Record<string, unknown>)[]}
        loading={loading}
        emptyMessage="No fee categories available."
        renderRowActions={(cat) => (
          <TableRowActions
            onEdit={() => handleEdit(cat)}
            onDelete={() => handleDeleteClick(cat)}
          />
        )}
        stickyHeader
        size="small"
      />
      {!loading && filteredCategories.length > 0 && (
        <TablePaginationBar
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={filteredCategories.length}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => {
            setRowsPerPage(v);
            setPage(0);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Please Confirm"
        message={"Are you sure you want to delete this fee category?"}
        confirmText={deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialogOpen(false)}
        loading={deleteLoading}
      />
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(null)}
      >
        <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: "100%" }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
};

// ...existing code...
export default FeeCategoryManagement;
