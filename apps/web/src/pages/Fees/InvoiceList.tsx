import { useMemo, useState } from "react";
import {
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { EntityTableSection, ListPageLayout, ListPageToolbar } from "../../components/reusable";
import { colorTokens } from "../../tokens/colors";
import { useFeePendingApprovalController, useInvoiceListController } from "../../hooks/useInvoiceListController";
import { useInvoicePermissions } from "../../hooks/useInvoicePermissions";
import type { FeePaymentApprovalListItem } from "../../types/feeCollection";
import { formatDateTime } from "../../utils/formatters";
import {
  createFeePendingApprovalColumns,
  createInvoiceListConfig,
  FEE_PENDING_APPROVAL_STATUS_OPTIONS,
} from "./InvoiceList.listConfig";

const INVOICE_ACTIONS_COLUMN_WIDTH = 80;

export default function InvoiceList() {
  const navigate = useNavigate();
  const controller = useInvoiceListController();
  const perms = useInvoicePermissions();
  const config = useMemo(
    () =>
      createInvoiceListConfig({
        onViewInvoice: (invoice) => navigate(`/fees/invoices/${invoice.id}/detail`),
        showStudentName: perms.showStudentColumn,
      }),
    [navigate, perms.showStudentColumn]
  );

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      onRefresh={() => controller.fetchInvoices({ silent: true })}
      data-testid="page-invoice-list"
      header={
        <>
          <PageHeader
            links={[{ title: "Invoices", path: "/fees/invoices" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={controller.search}
                onSearchChange={controller.setSearch}
                searchPlaceholder={
                  perms.readOnlyAudience
                    ? "Search by invoice ID..."
                    : "Search by student name / invoice ID..."
                }
                renderActions={
                  perms.readOnlyAudience ? undefined : (
                  <>
                    <Select
                      value={controller.classId}
                      onChange={(e) => controller.setClassId(e.target.value as string)}
                      displayEmpty
                      size="small"
                      data-testid="input-class"
                      sx={{ minWidth: { xs: "100%", sm: 140 } }}
                    >
                      <MenuItem value="">All Classes</MenuItem>
                      {controller.classes.map((c) => (
                        <MenuItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      value={controller.divisionId}
                      onChange={(e) => controller.setDivisionId(e.target.value as string)}
                      displayEmpty
                      size="small"
                      disabled={!controller.classId}
                      data-testid="input-division"
                      sx={{ minWidth: { xs: "100%", sm: 140 } }}
                    >
                      <MenuItem value="">
                        <Typography variant="body2" color="text.secondary">
                          All Divisions
                        </Typography>
                      </MenuItem>
                      {controller.divisionOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      value={controller.studentId}
                      onChange={(e) => controller.setStudentId(e.target.value as string)}
                      displayEmpty
                      size="small"
                      disabled={!controller.classId || !controller.divisionId}
                      data-testid="input-student"
                      sx={{ minWidth: { xs: "100%", sm: 180 } }}
                    >
                      <MenuItem value="">
                        <Typography variant="body2" color="text.secondary">
                          All Students
                        </Typography>
                      </MenuItem>
                      {controller.studentOptions.map((option) => (
                        <MenuItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      value={controller.status}
                      onChange={(e) => controller.setStatus(e.target.value as string)}
                      displayEmpty
                      size="small"
                      data-testid="input-status"
                      sx={{ minWidth: { xs: "100%", sm: 140 } }}
                    >
                      <MenuItem value="">
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                      </MenuItem>
                      {controller.statusOptions.map((s) => (
                        <MenuItem key={s.value} value={s.value}>
                          {s.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                  )
                }
              />
            }
          />
          {controller.error && (
            <Alert severity="error" sx={{ m: 2 }} onClose={() => controller.setError(null)}>
              {controller.error}
            </Alert>
          )}
        </>
      }
    >
      <EntityTableSection
        label=""
        data-testid="grid-invoices"
        emptyTestId="grid-invoices-empty"
        loadingTestId="grid-invoices-loading"
        rowTestId={(invoice) => `grid-invoices-row-${invoice.id}`}
        totalRows={controller.totalRows}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.setPage}
        onRowsPerPageChange={controller.setRowsPerPage}
        columns={config.columns}
        data={controller.invoices}
        loading={controller.loading}
        emptyMessage={config.uiPolicy.emptyMessage}
        rowActions={config.actions.rowActions}
        fixedLayout
        actionsColumnWidth={INVOICE_ACTIONS_COLUMN_WIDTH}
        getRowKey={(invoice) => invoice.id}
        stickyHeader
        size="small"
        showInfoBar={false}
      />
    </ListPageLayout>
  );
}

const PENDING_ACTIONS_WIDTH = 140;

export function FeePendingApprovalPage() {
  const controller = useFeePendingApprovalController();
  const perms = useInvoicePermissions();
  const columns = useMemo(() => createFeePendingApprovalColumns(), []);
  const [viewRow, setViewRow] = useState<FeePaymentApprovalListItem | null>(null);
  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const canAct = perms.canEdit && !perms.readOnlyAudience;

  const handleApprove = async () => {
    if (!approveId) return;
    try {
      setActionLoading(true);
      await controller.approve(approveId);
      setApproveId(null);
      await controller.refetch();
    } catch (err: any) {
      controller.setError(err?.message || "Unable to approve payment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      setActionLoading(true);
      await controller.reject(rejectId, rejectReason.trim());
      setRejectId(null);
      setRejectReason("");
      await controller.refetch();
    } catch (err: any) {
      controller.setError(err?.message || "Unable to reject payment.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ListPageLayout
      onRefresh={() => controller.refetch()}
      data-testid="page-fee-pending-approval"
      header={
        <>
          <PageHeader
            links={[{ title: "Fee Pending Approval", path: "/fees/pending-approval" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={controller.search}
                onSearchChange={controller.setSearch}
                searchPlaceholder="Search student or transaction ID"
                renderActions={
                  <>
                    <Select
                      value={controller.classId}
                      onChange={(e) => controller.setClassId(e.target.value)}
                      displayEmpty
                      size="small"
                      data-testid="input-class"
                      sx={{ minWidth: { xs: "100%", sm: 140 } }}
                    >
                      <MenuItem value="">All Classes</MenuItem>
                      {controller.classes.map((c) => (
                        <MenuItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      value={controller.divisionId}
                      onChange={(e) => controller.setDivisionId(e.target.value)}
                      displayEmpty
                      size="small"
                      disabled={!controller.classId}
                      data-testid="input-division"
                      sx={{ minWidth: { xs: "100%", sm: 140 } }}
                    >
                      <MenuItem value="">All Divisions</MenuItem>
                      {controller.divisionOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      value={controller.studentId}
                      onChange={(e) => controller.setStudentId(e.target.value)}
                      displayEmpty
                      size="small"
                      disabled={!controller.classId || !controller.divisionId}
                      data-testid="input-student"
                      sx={{ minWidth: { xs: "100%", sm: 180 } }}
                    >
                      <MenuItem value="">All Students</MenuItem>
                      {controller.studentOptions.map((option) => (
                        <MenuItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      value={controller.status}
                      onChange={(e) => controller.setStatus(e.target.value as typeof controller.status)}
                      size="small"
                      data-testid="input-status"
                      sx={{ minWidth: { xs: "100%", sm: 160 } }}
                    >
                      {FEE_PENDING_APPROVAL_STATUS_OPTIONS.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                          {item.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                }
              />
            }
          />
          {controller.error && (
            <Alert severity="error" sx={{ m: 2 }} onClose={() => controller.setError(null)}>
              {controller.error}
            </Alert>
          )}
        </>
      }
    >
      <EntityTableSection
        label="Pending Approval Records"
        data-testid="grid-fee-pending-approval"
        emptyTestId="grid-fee-pending-approval-empty"
        loadingTestId="grid-fee-pending-approval-loading"
        rowTestId={(row) => `grid-fee-pending-approval-row-${row.id}`}
        totalRows={controller.totalRows}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.setPage}
        onRowsPerPageChange={controller.setRowsPerPage}
        columns={columns}
        data={controller.items}
        loading={controller.loading}
        emptyMessage="No pending approval records found"
        actionsColumnWidth={PENDING_ACTIONS_WIDTH}
        getRowKey={(row) => row.id}
        stickyHeader
        size="small"
        renderRowActions={(row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="View">
              <IconButton size="small" onClick={() => setViewRow(row)} data-testid={`btn-view-${row.id}`}>
                <VisibilityIcon fontSize="small" sx={{ color: colorTokens.preschool.lavender.main }} />
              </IconButton>
            </Tooltip>
            {canAct && row.status === "Pending Approval" && (
              <>
                <Tooltip title="Approve">
                  <IconButton
                    size="small"
                    onClick={() => setApproveId(row.id)}
                    data-testid={`btn-approve-${row.id}`}
                    sx={{ color: colorTokens.preschool.mint.main }}
                  >
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setRejectId(row.id);
                      setRejectReason("");
                    }}
                    data-testid={`btn-reject-${row.id}`}
                    sx={{ color: colorTokens.preschool.coral.main }}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        )}
      />

      <Dialog open={viewRow !== null} onClose={() => setViewRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent dividers>
          {viewRow && (
            <Stack spacing={1}>
              <Typography variant="body2"><strong>Date:</strong> {formatDateTime(viewRow.request_date)}</Typography>
              <Typography variant="body2"><strong>Student:</strong> {viewRow.student_name}</Typography>
              <Typography variant="body2"><strong>Amount:</strong> ₹{Number(viewRow.amount).toLocaleString()}</Typography>
              <Typography variant="body2"><strong>Payment Mode:</strong> {viewRow.payment_method}</Typography>
              <Typography variant="body2"><strong>Transaction ID:</strong> {viewRow.transaction_id || "—"}</Typography>
              <Typography variant="body2"><strong>Status:</strong> {viewRow.status}</Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={approveId !== null}
        onClose={() => setApproveId(null)}
        onConfirm={handleApprove}
        title="Approve Payment?"
        message="Are you sure you want to approve this fee payment?"
        confirmLabel={actionLoading ? "Approving…" : "Approve"}
        loading={actionLoading}
        data-testid="dialog-approve-payment"
      />

      <ConfirmDialog
        open={rejectId !== null}
        onClose={() => {
          setRejectId(null);
          setRejectReason("");
        }}
        onConfirm={handleReject}
        title="Reject Payment?"
        confirmLabel={actionLoading ? "Rejecting…" : "Reject"}
        confirmDisabled={rejectReason.trim().length === 0}
        loading={actionLoading}
        data-testid="dialog-reject-payment"
      >
        <TextField
          autoFocus
          label="Reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          size="small"
          data-testid="input-reject-reason"
        />
      </ConfirmDialog>
    </ListPageLayout>
  );
}
