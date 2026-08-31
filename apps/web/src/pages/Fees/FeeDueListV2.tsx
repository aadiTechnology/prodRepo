import { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "../../components/layout";
import {
  EntityTableSection,
  ListPageLayout,
  ListPageToolbar,
} from "../../components/reusable";
import { type FeeDueStatusFilter } from "../../api/services/feesApi";
import { useFeeDueListController, type FeeDueTableRow } from "../../hooks/useFeeDueListController";
import {
  createFeeDueListV2Columns,
  FEE_DUE_STATUS_OPTIONS,
} from "./FeeDueListV2.listConfig";

export default function FeeDueListV2() {
  const navigate = useNavigate();
  const controller = useFeeDueListController();

  const columns = useMemo(() => createFeeDueListV2Columns({ navigate }), [navigate]);

  return (
    <ListPageLayout
      onRefresh={async () => { await Promise.resolve(controller.refetch()); }}
      data-testid="page-fee-due-list"
      header={
        <>
          <PageHeader
            links={[{ title: "Fee Due List", path: "/fees/due-list-v2" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={controller.search}
                onSearchChange={controller.setSearch}
                searchPlaceholder="Search by student name or invoice ID"
                renderActions={
                  <>
                    <Select
                      value={controller.classId}
                      onChange={(e) => controller.setClassId(e.target.value)}
                      displayEmpty
                      size="small"
                      data-testid="input-class"
                      sx={{ minWidth: { xs: "100%", sm: 150 } }}
                    >
                      <MenuItem value="">All Classes</MenuItem>
                      {controller.classes.map((item) => (
                        <MenuItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      value={controller.installment}
                      onChange={(e) => controller.setInstallment(e.target.value)}
                      displayEmpty
                      size="small"
                      data-testid="input-installment"
                      sx={{ minWidth: { xs: "100%", sm: 150 } }}
                    >
                      <MenuItem value="">All Installments</MenuItem>
                      {controller.installmentOptions.map((item) => (
                        <MenuItem key={item} value={item}>
                          {item}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      value={controller.status}
                      onChange={(e) => controller.setStatus(e.target.value as FeeDueStatusFilter)}
                      size="small"
                      data-testid="input-status"
                      sx={{ minWidth: { xs: "100%", sm: 150 } }}
                    >
                      {FEE_DUE_STATUS_OPTIONS.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                          {item.value === "ALL" ? "All Statuses" : item.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                }
              />
            }
          />
        </>
      }
    >
      {controller.error && !controller.loading && (
        <Box
          sx={{
            m: 2,
            display: "flex",
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Alert severity="error" sx={{ flex: 1, minWidth: 0 }}>
            {controller.error}
          </Alert>
          <Button
            variant="outlined"
            color="error"
            size="small"
            data-testid="btn-retry"
            onClick={controller.refetch}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" }, width: { xs: "100%", sm: "auto" } }}
          >
            Retry
          </Button>
        </Box>
      )}
      <Box sx={{ mt: 3 }}>
        <EntityTableSection<FeeDueTableRow>
          label="Fee Due Records"
          data-testid="grid-fee-due"
          emptyTestId="grid-fee-due-empty"
          loadingTestId="grid-fee-due-loading"
          rowTestId={(row) =>
            row.__skeleton ? undefined : `grid-fee-due-row-${row.invoice_row_id ?? row.__key}`
          }
          totalRows={controller.total}
          page={controller.page}
          rowsPerPage={controller.rowsPerPage}
          onPageChange={controller.setPage}
          onRowsPerPageChange={(value) => {
            controller.setRowsPerPage(value);
            controller.setPage(0);
          }}
          columns={columns}
          data={controller.rows}
          loading={controller.loading}
          emptyMessage="No due records found"
          renderRowActions={(row) =>
            row.__skeleton ? null : row.invoice_row_id !== null && row.invoice_row_id !== undefined ? (
              <Tooltip title="View Invoice Details">
                <IconButton
                  size="small"
                  aria-label="view invoice details"
                  data-testid="btn-view-row"
                  onClick={() => navigate(`/fees/invoices/${row.invoice_row_id}/detail`)}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              "-"
            )
          }
          getRowKey={(row) => row.__key}
          stickyHeader
          size="small"
        />
      </Box>
    </ListPageLayout>
  );
}

