import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Box, 
  Typography, 
  Button, 
  Select, 
  MenuItem, 
  Stack, 
  CircularProgress,
  Dialog,
  TextField
} from "../../components/primitives";
import { 
  ListPageLayout, 
  ListPageToolbar, 
  DataTable, 
  TableRowActions, 
  TablePaginationBar, 
  DirectoryInfoBar
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { SaveButton, CancelButton } from "../../components/semantic";
import { 
  FeeStructure, 
  FeeCategory, 
  AcademicYear, 
  ClassEntity, 
  FeeInstallment 
} from "../../types/fee";
import feeService from "../../api/services/feeService";
import StatusChip from "../../components/roles/StatusChip";
import { Home as HomeIcon } from "@mui/icons-material";

const FeeStructureSetup = () => {
  const navigate = useNavigate();
  
  // -- State --
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Confirm Dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [structureToDelete, setStructureToDelete] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Lookups (no longer needed in this page, moved to form)
  
  // -- Data Fetching --
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await feeService.getFeeStructures(page, rowsPerPage, search);
      setStructures(res.items);
      setTotalRecords(res.total);
    } catch (err: any) {
      setError(err.message || "Failed to load fee structures.");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);



  // -- Handlers --
  const handleAddClick = () => {
    navigate("/fees/setup/add");
  };

  const handleEditClick = (structure: FeeStructure) => {
    navigate(`/fees/setup/${structure.id}/edit`);
  };

  const handleDeleteClick = (id: number) => {
    setStructureToDelete(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!structureToDelete) return;
    try {
      setDeleteLoading(true);
      await feeService.deleteFeeStructure(structureToDelete);
      setConfirmOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to delete structure.");
    } finally {
      setDeleteLoading(false);
      setStructureToDelete(null);
    }
  };

  // -- Table Config --
  const columns = useMemo(() => [
    { id: "class", label: "Class", render: (s: FeeStructure) => s.class_name || "N/A" },
    { id: "category", label: "Category", render: (s: FeeStructure) => s.fee_category_name || "N/A" },
    { id: "ay", label: "Academic Year", render: (s: FeeStructure) => s.academic_year_name || "N/A" },
    { id: "amount", label: "Total Amount", render: (s: FeeStructure) => `₹${Number(s.total_amount).toLocaleString()}` },
    { id: "type", label: "Installment Type", render: (s: FeeStructure) => s.installment_type },
    { id: "status", label: "Status", render: (s: FeeStructure) => <StatusChip status={s.is_active ? "ACTIVE" : "INACTIVE"} /> },
  ], []);

  const rangeStart = totalRecords > 0 ? page * rowsPerPage + 1 : 0;
  const rangeEnd = Math.min((page + 1) * rowsPerPage, totalRecords);

  return (
    <ListPageLayout
      header={
        <PageHeader
          title="Fee Structure Setup"
          onBack={() => navigate("/")}
          backIcon={<HomeIcon sx={(theme) => ({ fontSize: theme.typography.h6.fontSize })} />}
          actions={
            <ListPageToolbar
              searchValue={search}
              onSearchChange={setSearch}
              onAddClick={handleAddClick}
              addLabel="Setup Fee"
              searchPlaceholder="Search by class..."
            />
          }
        />
      }
    >
      {error && (
        <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", bgcolor: "error.light", mb: 2 }}>
          <Typography color="error.main">{error}</Typography>
          <Button size="small" variant="outlined" color="error" onClick={fetchData}>Retry</Button>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <DirectoryInfoBar 
            label="Structures" 
            rangeStart={rangeStart} 
            rangeEnd={rangeEnd} 
            total={totalRecords} 
          />
          <DataTable<FeeStructure & Record<string, any>>
            columns={columns}
            data={structures as (FeeStructure & Record<string, any>)[]}
            renderRowActions={(s) => (
              <TableRowActions 
                onEdit={() => handleEditClick(s)} 
                onDelete={() => handleDeleteClick(s.id)} 
              />
            )}
            emptyMessage="No fee structures found. Click 'Setup Fee' to begin."
          />
          <TablePaginationBar
            page={page}
            rowsPerPage={rowsPerPage}
            totalRows={totalRecords}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Fee Structure?"
        message="This will remove the configuration and linked installment schedule. Are you sure?"
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={deleteLoading}
      />
    </ListPageLayout>
  );
};

export default FeeStructureSetup;
