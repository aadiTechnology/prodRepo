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

  // Handle search input change and reset to first page to ensure sync with entire data
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  
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
      const res = await feeService.getFeeStructures(
        page,
        rowsPerPage,
        search,
        selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
        selectedClassId ? Number(selectedClassId) : undefined
      );
      setStructures(res.items);
      setTotalRecords(res.total);
    } catch (err: any) {
      let msg = err.message || "Failed to load fee structures.";
      if (err?.response?.status === 409 || msg.toLowerCase().includes("already exists")) {
          msg = "Fee structure already exists for this class and category";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, selectedAcademicYearId, selectedClassId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch filter lookups
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const results = await Promise.allSettled([
          feeService.getAcademicYears(),
          feeService.getClasses(),
        ]);

        if (results[0].status === 'fulfilled') {
          setAcademicYears(results[0].value);
        } else {
          console.error("Failed to load academic years", results[0].reason);
        }

        if (results[1].status === 'fulfilled') {
          setClasses(results[1].value);
        } else {
          console.error("Failed to load classes", results[1].reason);
        }
      } catch (err) {
        // silent failure – main list will still load
        console.error("Unexpected error loading lookups", err);
      }
    };
    loadLookups();
  }, []);

  const handleAcademicYearChange = (value: string) => {
    setSelectedAcademicYearId(value);
    setPage(0);
  };

  const handleClassChange = (value: string) => {
    setSelectedClassId(value);
    setPage(0);
  };


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
      let msg = err.message || "Failed to delete structure.";
      if (err?.response?.status === 409 || msg.toLowerCase().includes("process") || msg.toLowerCase().includes("pay")) {
          msg = "Cannot delete structure: Payments have already been processed";
      } else if (msg.toLowerCase().includes("already exists")) {
          msg = "Fee structure already exists for this class and category";
      }
      setError(msg);
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
          links={[{ title: "Fee Structure Setup", path: "#" }]}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={search}
              onSearchChange={handleSearchChange} // Trigger search with pagination reset
              renderActions={
                <> {/* Custom filters rendered here (Filter > Search > Add) */}
                  <Select
                    value={selectedClassId}
                    onChange={(e) => handleClassChange(e.target.value as string)}
                    displayEmpty
                    size="small"
                    sx={{
                      minWidth: { xs: "100%", sm: 180 },
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "15px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      },
                    }}
                  >
                    <MenuItem value="">
                      <Typography variant="body2" color="text.secondary">
                        Class
                      </Typography>
                    </MenuItem>
                    {classes.map((cls) => (
                      <MenuItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <Select
                    value={selectedAcademicYearId}
                    onChange={(e) => handleAcademicYearChange(e.target.value as string)}
                    displayEmpty
                    size="small"
                    sx={{
                      minWidth: { xs: "100%", sm: 180 },
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "15px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      },
                    }}
                  >
                    <MenuItem value="">
                      <Typography variant="body2" color="text.secondary">
                        Academic Year
                      </Typography>
                    </MenuItem>
                    {academicYears.map((ay) => (
                      <MenuItem key={ay.id} value={ay.id.toString()}>
                        {ay.name}
                      </MenuItem>
                    ))}
                  </Select>
                </>
              }
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
