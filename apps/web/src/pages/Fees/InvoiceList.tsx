import { useMemo } from "react";
import { Alert, MenuItem, Select, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout";
import { EntityTableSection, ListPageLayout, ListPageToolbar } from "../../components/reusable";
import { useInvoiceListController } from "../../hooks/useInvoiceListController";
import { useInvoicePermissions } from "../../hooks/useInvoicePermissions";
import { createInvoiceListConfig } from "./InvoiceList.listConfig";

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
                onAddClick={
                  perms.canCreateInvoices
                    ? () => navigate("/fees/generate-invoice")
                    : undefined
                }
                addLabel="Generate Invoice"
                addIcon={<AddIcon sx={{ fontSize: 24 }} />}
                addButtonTestId="btn-generate-invoice"
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
