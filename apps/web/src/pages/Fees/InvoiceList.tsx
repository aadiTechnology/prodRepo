import { useMemo } from "react";
import { Alert, MenuItem, Select, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout";
import { EntityTableSection, ListPageLayout, ListPageToolbar } from "../../components/reusable";
import { useInvoiceListController } from "../../hooks/useInvoiceListController";
import { createInvoiceListConfig } from "./InvoiceList.listConfig";

export default function InvoiceList() {
  const navigate = useNavigate();
  const controller = useInvoiceListController();
  const config = useMemo(
    () =>
      createInvoiceListConfig({
        onViewInvoice: (invoice) => navigate(`/fees/invoices/${invoice.id}/detail`),
        onCollectPayment: (invoice) =>
          navigate("/fees/installment-status", {
            state: {
              student: {
                id: invoice.student_id,
                student_name: invoice.student_name,
                admission_no: invoice.admission_no,
                class_id: invoice.class_id,
                class_name: invoice.class_name,
              },
              classId: invoice.class_id,
              academicYearId: invoice.academic_year_id,
            },
          }),
      }),
    [navigate]
  );

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[{ title: "Invoice List", path: "/fees/invoices" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={controller.search}
                onSearchChange={controller.setSearch}
                searchPlaceholder="Search by student name / invoice ID..."
                onAddClick={() => navigate("/fees/generate-invoice")}
                addLabel="Generate Invoice"
                addIcon={<AddIcon sx={{ fontSize: 24 }} />}
                renderActions={
                  <>
                    <Select
                      value={controller.classId}
                      onChange={(e) => controller.setClassId(e.target.value as string)}
                      displayEmpty
                      size="small"
                      sx={{ minWidth: { xs: "100%", sm: 140 } }}
                    >
                      <MenuItem value="">
                        <Typography variant="body2" color="text.secondary">
                          Class
                        </Typography>
                      </MenuItem>
                      {controller.classes.map((c) => (
                        <MenuItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      value={controller.status}
                      onChange={(e) => controller.setStatus(e.target.value as string)}
                      displayEmpty
                      size="small"
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
                    <Select
                      value={controller.installment}
                      onChange={(e) => controller.setInstallment(e.target.value as string)}
                      displayEmpty
                      size="small"
                      sx={{ minWidth: { xs: "100%", sm: 180 } }}
                    >
                      <MenuItem value="">
                        <Typography variant="body2" color="text.secondary">
                          Installment
                        </Typography>
                      </MenuItem>
                      {controller.installmentOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
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
        label="Invoice Directory"
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
      />
    </ListPageLayout>
  );
}
