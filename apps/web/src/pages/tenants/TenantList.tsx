import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    IconButton,
    Alert,
    CircularProgress,
    TextField,
    InputAdornment,
    Tooltip,
    Select,
    MenuItem,
    Dialog,
    Snackbar,
    Button,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Search as SearchIcon,
    Delete as DeleteIcon,
    Home as HomeIcon,
    Cancel as CancelIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTheme, useMediaQuery } from "@mui/material";
import { Tenant } from "../../types/tenant";
import tenantService from "../../api/services/tenantService";

// Style object for confirmation popup divider
const confirmDividerStyle = {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    margin: 0,
    height: 0,
};

const TenantList = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Search and Pagination states
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalTenants, setTotalTenants] = useState(0);

    // Confirm dialog states
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Snackbar/toast state
    const [snackbar, setSnackbar] = useState<string | null>(null);
    const showSuccessToast = (message: string) => setSnackbar(message);

    // Sorting state
    const [sortBy, setSortBy] = useState<"name" | "created_at">("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const fetchTenants = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await tenantService.list({
                search: search || undefined,
                page: page + 1,
                page_size: rowsPerPage,
            });
            setTenants(data.items);
            setTotalTenants(data.total);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch tenants.");
        } finally {
            setLoading(false);
        }
    }, [search, page, rowsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTenants();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchTenants]);

    const handleDeleteClick = (tenant: Tenant) => {
        setTenantToDelete(tenant);
        setConfirmDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!tenantToDelete) return;
        try {
            setDeleteLoading(true);
            await tenantService.delete(tenantToDelete.id);
            setConfirmDialogOpen(false);
            setTenantToDelete(null);
            showSuccessToast("Tenant deleted successfully");
            fetchTenants();
        } catch (err: any) {
            setError(err?.message || "Failed to delete tenant.");
        } finally {
            setDeleteLoading(false);
        }
    };

    // Client-side sort on fetched tenants
    const sortedTenants = [...tenants].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (sortBy === "created_at") {
            aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
            bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        } else {
            aVal = (a.name || "").toLowerCase();
            bVal = (b.name || "").toLowerCase();
        }

        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    return (
        <Box
            sx={{
                px: { xs: 2, md: 4 },
                pb: 4,
                minHeight: "100vh",
                backgroundColor: "#f8fafc",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    pt: 1.5,
                    pb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <IconButton
                        onClick={() => navigate("/")}
                        sx={{
                            backgroundColor: "#1a1a2e",
                            borderRadius: 1.2,
                            width: 44,
                            height: 44,
                            "&:hover": { backgroundColor: "#2d2d44" },
                        }}
                    >
                        <HomeIcon sx={{ color: "white", fontSize: 24 }} />
                    </IconButton>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            fontSize: "22px",
                            color: "#1A1A2E",
                            letterSpacing: "-1px",
                        }}
                    >
                        Tenant Management
                    </Typography>
                </Box>

                {/* Actions Row */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        width: { xs: "100%", sm: "auto" },
                    }}
                >
                    <TextField
                        placeholder="Search tenants..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        variant="outlined"
                        size="small"
                        fullWidth={isMobile}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            width: { xs: "100%", sm: "280px" },
                            "& .MuiOutlinedInput-root": {
                                bgcolor: "white",
                                borderRadius: "12px",
                                fontSize: "0.9rem",
                                fontWeight: 500,
                                "& fieldset": { borderColor: "#e2e8f0", borderWidth: "1.2px" },
                                "&:hover fieldset": { borderColor: "#cbd5e1" },
                                "&.Mui-focused": {
                                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
                                    "& fieldset": { borderColor: "#1A1A2E", borderWidth: "1.8px" },
                                },
                            },
                        }}
                    />
                    <Tooltip title="Add Tenant">
                        <IconButton
                            onClick={() => navigate("/tenants/add")}
                            sx={{
                                backgroundColor: "#1a1a2e",
                                color: "white",
                                borderRadius: 1.2,
                                width: 44,
                                height: 44,
                                boxShadow: "0 4px 10px rgba(26,26,46,0.2)",
                                "&:hover": { backgroundColor: "#2d2d44", transform: "translateY(-1px)" },
                            }}
                        >
                            <AddIcon sx={{ fontSize: 24 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Paper
                sx={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.01)",
                    border: "1px solid #e2e8f0",
                    bgcolor: "white",
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {error && (
                    <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Info Bar */}
                {!loading && totalTenants > 0 && (
                    <Box
                        sx={{
                            py: 1.2,
                            px: 3,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "1px solid #f1f5f9",
                            bgcolor: "#fcfdfe",
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: "0.80rem",
                                color: "#64748b",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                            }}
                        >
                            Tenant Directory
                        </Typography>
                        <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>
                            Showing{" "}
                            <Box component="span" sx={{ color: "#1a1a2e", fontWeight: 700 }}>
                                {Math.min(page * rowsPerPage + 1, totalTenants)}-
                                {Math.min((page + 1) * rowsPerPage, totalTenants)}
                            </Box>{" "}
                            of{" "}
                            <Box component="span" sx={{ color: "#1a1a2e", fontWeight: 700 }}>
                                {totalTenants}
                            </Box>{" "}
                            tenants
                        </Typography>
                    </Box>
                )}

                <TableContainer sx={{ maxHeight: "calc(100vh - 200px)" }}>
                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
                            <CircularProgress sx={{ color: "#1a1a2e" }} />
                        </Box>
                    ) : (
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Logo
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                            cursor: "pointer",
                                            userSelect: "none",
                                        }}
                                        onClick={() => {
                                            if (sortBy === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                            else { setSortBy("name"); setSortOrder("asc"); }
                                        }}
                                    >
                                        Tenant Name{" "}
                                        {sortBy === "name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Owner
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Email
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Status
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                            cursor: "pointer",
                                            userSelect: "none",
                                        }}
                                        onClick={() => {
                                            if (sortBy === "created_at") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                            else { setSortBy("created_at"); setSortOrder("asc"); }
                                        }}
                                    >
                                        Created Date{" "}
                                        {sortBy === "created_at" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Edit
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Delete
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedTenants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                            <Typography variant="body1" color="text.secondary">
                                                No tenants available.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedTenants.map((tenant) => (
                                        <TableRow
                                            key={tenant.id}
                                            hover
                                            sx={{
                                                "&.MuiTableRow-hover:hover": { bgcolor: "#f1f5f9" },
                                                "& td": { borderBottom: "1px solid #f1f5f9" },
                                            }}
                                        >
                                            <TableCell sx={{ py: 0.8, px: 2 }}>
                                                {tenant.logo_url ? (
                                                    <img
                                                        src={tenant.logo_url}
                                                        alt={tenant.name}
                                                        style={{
                                                            height: 32,
                                                            width: "auto",
                                                            maxWidth: 90,
                                                            objectFit: "contain",
                                                        }}
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                                                        —
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    fontWeight: 700,
                                                    color: "#1a1a2e",
                                                    py: 0.8,
                                                    px: 2,
                                                    fontSize: "0.85rem",
                                                }}
                                            >
                                                {tenant.name}
                                            </TableCell>
                                            <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                                                {tenant.owner_name}
                                            </TableCell>
                                            <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                                                {tenant.email}
                                            </TableCell>
                                            <TableCell sx={{ py: 0.8, px: 2 }}>
                                                <Box
                                                    sx={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        px: 1.2,
                                                        py: 0.35,
                                                        borderRadius: "20px",
                                                        bgcolor: tenant.is_active
                                                            ? "rgba(16, 185, 129, 0.1)"
                                                            : "rgba(239, 68, 68, 0.1)",
                                                        color: tenant.is_active ? "#059669" : "#dc2626",
                                                        border: `1px solid ${tenant.is_active
                                                            ? "rgba(16, 185, 129, 0.2)"
                                                            : "rgba(239, 68, 68, 0.2)"
                                                            }`,
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 5,
                                                            height: 5,
                                                            borderRadius: "50%",
                                                            bgcolor: "currentColor",
                                                        }}
                                                    />
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: "0.7rem",
                                                            textTransform: "uppercase",
                                                            letterSpacing: "0.5px",
                                                        }}
                                                    >
                                                        {tenant.is_active ? "Active" : "Inactive"}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                                                {tenant.created_at && !isNaN(new Date(tenant.created_at).getTime())
                                                    ? new Date(tenant.created_at).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "2-digit",
                                                        year: "numeric",
                                                    })
                                                    : "-"}
                                            </TableCell>
                                            <TableCell sx={{ py: 0.8, px: 2 }}>
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
                                                        sx={{
                                                            color: "#94a3b8",
                                                            "&:hover": { color: "#1713eaff" },
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ py: 0.9, px: 2 }}>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteClick(tenant)}
                                                        sx={{
                                                            color: "#94a3b8",
                                                            "&:hover": { color: "#ef4444" },
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                {/* Custom Pagination Footer */}
                {!loading && tenants.length > 0 && (
                    <Box
                        sx={{
                            px: 2,
                            py: 1,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderTop: "1px solid #f1f5f9",
                            bgcolor: "#fcfdfe",
                        }}
                    >
                        {/* Left: Rows Per Page */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                                Rows per page
                            </Typography>
                            <Select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setPage(0);
                                }}
                                size="small"
                                sx={{
                                    height: "28px",
                                    width: "65px",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    bgcolor: "white",
                                    borderRadius: "6px",
                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" },
                                }}
                            >
                                <MenuItem value={10}>10</MenuItem>
                                <MenuItem value={20}>20</MenuItem>
                                <MenuItem value={25}>25</MenuItem>
                                <MenuItem value={50}>50</MenuItem>
                            </Select>
                        </Box>

                        {/* Right: Page Navigation with numbered boxes */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            {/* Prev arrow */}
                            <IconButton
                                size="small"
                                disabled={page === 0}
                                onClick={() => setPage(page - 1)}
                                sx={{
                                    width: 30, height: 30,
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "6px",
                                    fontSize: "0.85rem",
                                    color: "#64748b",
                                    "&:hover": { bgcolor: "#f1f5f9" },
                                    "&.Mui-disabled": { opacity: 0.35 },
                                }}
                            >
                                {"<"}
                            </IconButton>

                            {/* Numbered page boxes */}
                            {Array.from({ length: Math.ceil(totalTenants / rowsPerPage) }, (_, i) => i).map((i) => (
                                <Box
                                    key={i}
                                    onClick={() => setPage(i)}
                                    sx={{
                                        width: 30, height: 30,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        borderRadius: "6px",
                                        border: "1px solid",
                                        borderColor: page === i ? "#1a1a2e" : "#e2e8f0",
                                        bgcolor: page === i ? "#1a1a2e" : "white",
                                        color: page === i ? "white" : "#64748b",
                                        fontSize: "0.8rem",
                                        fontWeight: page === i ? 700 : 500,
                                        cursor: "pointer",
                                        userSelect: "none",
                                        transition: "all 0.15s",
                                        "&:hover": {
                                            bgcolor: page === i ? "#1a1a2e" : "#f1f5f9",
                                            borderColor: page === i ? "#1a1a2e" : "#cbd5e1",
                                        },
                                    }}
                                >
                                    {i + 1}
                                </Box>
                            ))}

                            {/* Next arrow */}
                            <IconButton
                                size="small"
                                disabled={page >= Math.ceil(totalTenants / rowsPerPage) - 1}
                                onClick={() => setPage(page + 1)}
                                sx={{
                                    width: 30, height: 30,
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "6px",
                                    fontSize: "0.85rem",
                                    color: "#64748b",
                                    "&:hover": { bgcolor: "#f1f5f9" },
                                    "&.Mui-disabled": { opacity: 0.35 },
                                }}
                            >
                                {">"}
                            </IconButton>
                        </Box>
                    </Box>
                )}
            </Paper>

            {/* Confirm Delete Dialog — matches RoleManagementPage & Users style */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => !deleteLoading && setConfirmDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxWidth: 600,
                        width: "100%",
                        p: 0,
                        position: "absolute",
                        top: "5%",
                        left: "50%",
                        transform: "translate(-50%, 0)",
                        height: "30%",
                        minHeight: "20px",
                        overflowY: "auto",
                    },
                }}
            >
                {/* Header bar */}
                <Box
                    sx={{
                        bgcolor: "#18183a",
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        px: 2,
                        py: 0.1,
                        minHeight: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
                    }}
                >
                    <Box />
                    <IconButton
                        aria-label="close"
                        onClick={() => setConfirmDialogOpen(false)}
                        disabled={deleteLoading}
                        sx={{ color: "white", bgcolor: "transparent", borderRadius: 2 }}
                    >
                        <CancelIcon sx={{ fontSize: 28 }} />
                    </IconButton>
                </Box>

                {/* Content */}
                <Box
                    sx={{
                        px: 4,
                        pt: 4,
                        pb: 2.5,
                        bgcolor: "white",
                        borderBottomLeftRadius: 12,
                        borderBottomRightRadius: 12,
                        textAlign: "left",
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                        <CheckIcon sx={{ fontSize: 50, color: "#43a047", mr: 2, p: 0 }} />
                        <Typography
                            sx={{
                                fontWeight: 175,
                                fontSize: "1.9rem",
                                color: "#18183a",
                                letterSpacing: "-1px",
                                lineHeight: 1.1,
                            }}
                        >
                            Please Confirm
                        </Typography>
                    </Box>
                    <Typography
                        sx={{ fontSize: "1.05rem", color: "#18183a", fontWeight: 125, mb: 1.2, ml: 3 }}
                    >
                        Are you sure you want to delete tenant{" "}
                        <strong>{tenantToDelete?.name}</strong>?
                    </Typography>
                    <Box sx={{ width: "100%", mb: 0.5 }}>
                        <hr style={confirmDividerStyle} />
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, width: "100%", mt: 0.5 }}>
                        <Button
                            onClick={() => setConfirmDialogOpen(false)}
                            disabled={deleteLoading}
                            sx={{
                                color: "#ef4444",
                                backgroundColor: "transparent",
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                                px: 4,
                                borderRadius: 0,
                                minWidth: 120,
                                boxShadow: "none",
                                border: "none",
                                "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            disabled={deleteLoading}
                            sx={{
                                color: "#43a047",
                                backgroundColor: "transparent",
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                                px: 4,
                                borderRadius: 0,
                                minWidth: 120,
                                boxShadow: "none",
                                border: "none",
                                "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
                            }}
                        >
                            {deleteLoading ? "Deleting..." : "Confirm"}
                        </Button>
                    </Box>
                </Box>
            </Dialog>

            {/* Success Snackbar */}
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
        </Box>
    );
};

export default TenantList;
