

import { useState, useCallback } from "react";
import { Box, Container, Paper, Typography, Button, LinearProgress, Alert } from "@mui/material";
import { Role } from "../types/role.types";
import { useNavigate } from "react-router-dom";
import RoleSummaryCards from "../components/roles/RoleSummaryCards";
import RoleTable from "../components/roles/RoleTable";
// import useDebounce from "../hooks/useDebounce";
import { useQuery } from "@tanstack/react-query";
import roleService from "../api/services/roleService";
import { useRBAC } from "../context/RBACContext";

export default function RoleManagementPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10); // Ensure default is 25

const handlePageChange = (newPage: number) => setPage(newPage);
const handlePageSizeChange = (newPageSize: number) => {
  setPageSize(newPageSize);
  setPage(0); // <-- Reset to first page when page size changes
};

const handlePaginationModelChange = (model: { page: number; pageSize: number }) => {
  setPage(model.page);
  setPageSize(model.pageSize);
};

  // const debouncedSearch = useDebounce(search, 500);

  // Summary cards
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["roleSummary"],
    queryFn: roleService.getRoleSummary,
  });

  // Role table
  const { data: rolesData, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useQuery<{ items: Role[]; totalCount: number; pageNumber: number; pageSize: number }>(
    {
      queryKey: ["roles", search, page, pageSize],
      queryFn: () =>
        roleService.getRoles({
          search: search,
          page: page + 1,
          pageSize,
        }),
    }
  );

  const handleAddRole = useCallback(() => {
    navigate("/roles/create");
  }, [navigate]);

  // 🟢 Define mappedRoles FIRST
  const mappedRoles: Role[] = (rolesData?.items ?? []).map((role: any) => {
    // Use the original value from backend for scope
    return {
      id: String(role.id),
      name: role.name ?? "",
      description: role.description ?? "",
      scope: role.scope_type ?? "PLATFORM",
      isSystemRole: !!role.is_system,
      status: role.is_active ? "ACTIVE" : "INACTIVE",
      createdAt: role.created_at,
      permissions: role.permissions ?? [],
    };
  });

  // 🟢 Now you can use mappedRoles
  const { roles } = useRBAC();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Role Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and define system permissions across the platform.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" onClick={handleAddRole} sx={{ minWidth: 140 }}>
          + Add Role
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2 }}>
          <RoleTable.SearchInput
            value={search}
            onChange={setSearch}
            loading={rolesLoading}
            placeholder="Search by role name..."
          />
        </Paper>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ mb: 3 }}>
        <RoleSummaryCards
          summary={summary}
          loading={summaryLoading}
          error={summaryError}
          onRetry={refetchSummary}
        />
      </Box>

      {/* Role Table */}
      <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2 }}>
        {rolesError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load roles. <Button onClick={() => refetchRoles()}>Retry</Button>
          </Alert>
        ) : (
          <RoleTable
            data={mappedRoles}
            loading={rolesLoading}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={handlePaginationModelChange}
            rowCount={rolesData?.totalCount ?? 0}
            search={search}
            refetchRoles={refetchRoles}
          />
        )}
      </Paper>
    </Container>
  );
}