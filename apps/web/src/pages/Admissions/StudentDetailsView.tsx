import { useMemo } from "react";
import {
  alpha,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Typography,
} from "@mui/material";
import {
  Edit as EditIcon,
  PersonOutline as PersonOutlineIcon,
  ContactPhone as ContactPhoneIcon,
  School as SchoolIcon,
  Payments as PaymentsIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";

import { PageHeader, PageLayout } from "../../components/layout";
import { DetailFieldRow } from "../../components/reusable";
import PrimaryActionButton from "../../components/reusable/PrimaryActionButton";
import StatusChip from "../../components/roles/StatusChip";
import { formatShortDate } from "../../utils/formatters";
import { colorTokens } from "../../tokens/colors";
import type { StudentDetails } from "../../api/services/studentService";
import type { EnrollmentFormData } from "./EnrollmentPage.formConfig";

type StudentViewMeta = {
  academic_year_name?: string;
  class_name?: string;
  class_division_name?: string;
  fee_structure_name?: string;
  discount_name?: string;
};

type StudentDetailsViewProps = {
  formData: EnrollmentFormData;
  studentViewMeta: StudentViewMeta;
  selectedDiscountLabel: string;
  feePreview: { total: number; discountAmount: number; finalAmount: number };
  loading: boolean;
  error: string | null;
  studentId?: string;
  studentRecord: StudentDetails | null;
  onBack: () => void;
  onEdit: () => void;
};

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1.25,
        bgcolor: colorTokens.surface.card,
        borderBottom: "1px solid",
        borderColor: colorTokens.border.default,
      }}
    >
      <Box sx={{ color: colorTokens.text.primary, display: "flex", alignItems: "center" }}>{icon}</Box>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          color: colorTokens.text.secondary,
          fontSize: "0.82rem",
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}

const fmtDate = (value?: string | null) => {
  if (!value) return "N/A";
  const d = dayjs(value);
  return d.isValid() ? d.format("MMM DD, YYYY") : "N/A";
};

export default function StudentDetailsView({
  formData,
  studentViewMeta,
  selectedDiscountLabel,
  feePreview,
  loading,
  error,
  studentId,
  studentRecord,
  onBack,
  onEdit,
}: StudentDetailsViewProps) {
  const assignment = useMemo(() => {
    const className = studentViewMeta.class_name || "N/A";
    const division = studentViewMeta.class_division_name ? ` - ${studentViewMeta.class_division_name}` : "";
    return `${className}${division}`;
  }, [studentViewMeta.class_division_name, studentViewMeta.class_name]);

  const fullAddress = useMemo(() => {
    const parts = [studentRecord?.address, studentRecord?.area, studentRecord?.city, studentRecord?.state, studentRecord?.pincode]
      .filter(Boolean)
      .map((item) => String(item));
    return parts.length ? parts.join(", ") : "N/A";
  }, [studentRecord?.address, studentRecord?.area, studentRecord?.city, studentRecord?.pincode, studentRecord?.state]);

  if (loading) {
    return (
      <PageLayout pageBackground maxWidth="lg">
        <Box sx={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout pageBackground maxWidth="lg">
        <Alert severity="error">{error}</Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      pageBackground
      maxWidth="lg"
      header={
        <PageHeader
          links={[
            { title: "Students", path: "/students" },
            { title: "Student Details", path: "#" },
          ]}
          homePath="/"
          actions={
            <PrimaryActionButton onClick={onEdit} icon={<EditIcon sx={{ fontSize: 20 }} />} label="Edit student" />
          }
        />
      }
    >
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={4} sx={{ display: "flex" }}>
          <Card
            variant="outlined"
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              borderColor: colorTokens.border.strong,
              overflow: "hidden",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              bgcolor: colorTokens.surface.card,
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 2.5,
                textAlign: "center",
                background: `linear-gradient(135deg, ${alpha(colorTokens.primary.main, 0.14)} 0%, ${alpha(colorTokens.preschool.turquoise.main, 0.16)} 100%)`,
                borderBottom: `1px solid ${colorTokens.border.default}`,
              }}
            >
              <Avatar
                src={formData.photo_url || undefined}
                sx={{
                  width: 112,
                  height: 112,
                  mx: "auto",
                  mb: 1.5,
                  fontSize: 40,
                  bgcolor: colorTokens.gray[300],
                  border: "3px solid",
                  borderColor: "common.white",
                  boxShadow: 2,
                }}
              >
                {formData.student_name?.charAt(0) || "S"}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.4, lineHeight: 1.2, color: colorTokens.text.primary }}>
                {formData.student_name || "N/A"}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mb: 1, color: colorTokens.text.secondary }}>
                Admission No: {formData.admission_no || studentId || "N/A"}
              </Typography>
              <StatusChip status={studentRecord?.is_active === false ? "INACTIVE" : "ACTIVE"} />
            </Box>

            <Box sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                <PhoneIcon sx={{ fontSize: 18, color: colorTokens.text.secondary }} />
                <Typography variant="body2" sx={{ color: colorTokens.text.primary }}>
                  {formData.mobile_number || "N/A"}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: colorTokens.border.default }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                <EmailIcon sx={{ fontSize: 18, color: colorTokens.text.secondary }} />
                <Typography variant="body2" sx={{ wordBreak: "break-word", color: colorTokens.text.primary }}>
                  {formData.email || "N/A"}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: colorTokens.border.default }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                <CalendarMonthIcon sx={{ fontSize: 18, color: colorTokens.text.secondary }} />
                <Typography variant="body2" sx={{ color: colorTokens.text.primary }}>
                  Joined: {formatShortDate(studentRecord?.created_at, { emptyPlaceholder: "N/A" })}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Updated ${formatShortDate(studentRecord?.updated_at, { emptyPlaceholder: "N/A" })}`}
                  sx={{
                    borderColor: colorTokens.border.strong,
                    color: colorTokens.text.secondary,
                    bgcolor: colorTokens.background.default,
                  }}
                />
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={8} sx={{ display: "flex" }}>
          <Card
            variant="outlined"
            sx={{
              flex: 1,
              borderRadius: 2,
              borderColor: colorTokens.border.strong,
              overflow: "hidden",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              bgcolor: colorTokens.surface.card,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ borderColor: colorTokens.border.default, borderRadius: 1.5, boxShadow: "none", height: "100%" }}>
                    <SectionHeader title="Personal" icon={<PersonOutlineIcon fontSize="small" />} />
                    <DetailFieldRow label="Gender" dense labelMinWidth={120}>
                      <Typography variant="body2">{formData.gender || "N/A"}</Typography>
                    </DetailFieldRow>
                    <DetailFieldRow label="Date of Birth" dense labelMinWidth={120} last>
                      <Typography variant="body2">{fmtDate(formData.date_of_birth)}</Typography>
                    </DetailFieldRow>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ borderColor: colorTokens.border.default, borderRadius: 1.5, boxShadow: "none", height: "100%" }}>
                    <SectionHeader title="Contact" icon={<ContactPhoneIcon fontSize="small" />} />
                    <DetailFieldRow label="Parent Name" dense labelMinWidth={120}>
                      <Typography variant="body2">{formData.parent_name || "N/A"}</Typography>
                    </DetailFieldRow>
                    <DetailFieldRow label="Mobile" dense labelMinWidth={120} last>
                      <Typography variant="body2">{formData.mobile_number || "N/A"}</Typography>
                    </DetailFieldRow>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ borderColor: colorTokens.border.default, borderRadius: 1.5, boxShadow: "none", height: "100%" }}>
                    <SectionHeader title="Academic" icon={<SchoolIcon fontSize="small" />} />
                    <DetailFieldRow label="Class/Division" dense labelMinWidth={120}>
                      <Typography variant="body2">{assignment}</Typography>
                    </DetailFieldRow>
                    <DetailFieldRow label="Academic Year" dense labelMinWidth={120}>
                      <Typography variant="body2">{studentViewMeta.academic_year_name || "N/A"}</Typography>
                    </DetailFieldRow>
                    <DetailFieldRow label="Roll Number" dense labelMinWidth={120} last>
                      <Typography variant="body2">{formData.roll_no || "N/A"}</Typography>
                    </DetailFieldRow>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ borderColor: colorTokens.border.default, borderRadius: 1.5, boxShadow: "none", height: "100%" }}>
                    <SectionHeader title="Fee" icon={<PaymentsIcon fontSize="small" />} />
                    <DetailFieldRow label="Fee Plan" dense labelMinWidth={120}>
                      <Typography variant="body2">{studentViewMeta.fee_structure_name || "N/A"}</Typography>
                    </DetailFieldRow>
                    <DetailFieldRow label="Discount" dense labelMinWidth={120}>
                      <Typography variant="body2">{selectedDiscountLabel || "None"}</Typography>
                    </DetailFieldRow>
                    <DetailFieldRow label="Final Amount" dense labelMinWidth={120} last>
                      <Typography variant="body2">{`INR ${feePreview.finalAmount.toFixed(2)}`}</Typography>
                    </DetailFieldRow>
                  </Card>
                </Grid>
              </Grid>

              <Card variant="outlined" sx={{ borderColor: colorTokens.border.default, borderRadius: 1.5, boxShadow: "none" }}>
                <SectionHeader title="Address" icon={<HomeIcon fontSize="small" />} />
                <DetailFieldRow label="Full Address" dense labelMinWidth={120}>
                  <Typography variant="body2">{fullAddress}</Typography>
                </DetailFieldRow>
                <DetailFieldRow label="City" dense labelMinWidth={120}>
                  <Typography variant="body2">{studentRecord?.city || "N/A"}</Typography>
                </DetailFieldRow>
                <DetailFieldRow label="State / Pincode" dense labelMinWidth={120} last>
                  <Typography variant="body2">
                    {studentRecord?.state || "N/A"} {studentRecord?.pincode ? `- ${studentRecord.pincode}` : ""}
                  </Typography>
                </DetailFieldRow>
              </Card>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2 }}>
        <Button variant="text" onClick={onBack}>
          Back
        </Button>
      </Box>
    </PageLayout>
  );
}
