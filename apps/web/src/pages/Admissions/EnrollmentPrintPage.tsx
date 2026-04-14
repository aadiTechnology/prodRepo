import { Box, Button, Card, CardContent, Divider, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

import ListPageLayout from "../../components/reusable/ListPageLayout";
import { PageHeader } from "../../components/layout";

export default function EnrollmentPrintPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const printable = (location.state || {}) as any;

  const student = printable?.student || {};
  const parent = printable?.parent || {};
  const fee = printable?.fee || {};

  return (
    <ListPageLayout
      pageBackground
      header={
        <Box sx={{ mb: 2 }}>
          <PageHeader
            links={[{ title: "Admissions", path: "/admissions/leads" }, { title: "Enrollment Receipt", path: "#" }]}
            homePath="/"
            actions={
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button variant="outlined" onClick={() => navigate("/admissions/enrollment")}>
                  New Enrollment
                </Button>
                <Button variant="contained" onClick={() => window.print()}>
                  Print
                </Button>
              </Box>
            }
          />
        </Box>
      }
    >
      <Card sx={{ borderRadius: 3, maxWidth: 820, mx: "auto" }}>
        <CardContent>
          <Typography variant="h6" fontWeight={900}>
            Enrollment Receipt / Admission Slip
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generated at: {printable?.generated_at || "-"}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            Student
          </Typography>
          <Typography variant="body2">Name: {student?.name || "-"}</Typography>
          <Typography variant="body2">Admission No: {student?.admission_no || "-"}</Typography>
          <Typography variant="body2">Admission Date: {student?.admission_date || "-"}</Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            Parent / Guardian
          </Typography>
          <Typography variant="body2">Name: {parent?.name || "-"}</Typography>
          <Typography variant="body2">Contact: {parent?.mobile_number || "-"}</Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            Fee Summary
          </Typography>
          <Typography variant="body2">Total Amount: {fee?.total_amount ?? "-"}</Typography>
          <Typography variant="body2">Final Amount: {fee?.final_amount ?? "-"}</Typography>
          <Typography variant="caption" color="text.secondary">
            Installments and details are available in fee ledger.
          </Typography>
        </CardContent>
      </Card>
    </ListPageLayout>
  );
}
