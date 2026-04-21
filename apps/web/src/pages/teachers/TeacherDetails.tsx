import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  alpha,
  Alert,
  Avatar,
  Box,
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
  AssignmentInd as AssignmentIndIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material";
import teacherService, { type TeacherResponse } from "../../api/services/teacherService";
import { PageHeader, PageLayout } from "../../components/layout";
import { DetailFieldRow } from "../../components/reusable";
import PrimaryActionButton from "../../components/reusable/PrimaryActionButton";
import StatusChip from "../../components/roles/StatusChip";
import { formatShortDate } from "../../utils/formatters";
import { colorTokens } from "../../tokens/colors";

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
      <Box sx={{ color: colorTokens.text.primary, display: "flex", alignItems: "center" }}>
        {icon}
      </Box>
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

export default function TeacherDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<TeacherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeacher = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await teacherService.getById(Number(id));
      setTeacher(data);
    } catch {
      setError("Unable to load teacher details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTeacher();
  }, [fetchTeacher]);

  const assignment = useMemo(() => {
    if (!teacher) return "N/A";
    const className = teacher.class_name || "N/A";
    const divisionName = teacher.division_name ? ` - ${teacher.division_name}` : "";
    return `${className}${divisionName}`;
  }, [teacher]);

  const fullAddress = useMemo(() => {
    if (!teacher) return "N/A";
    const parts = [teacher.address, teacher.city, teacher.state, teacher.pincode].filter(Boolean);
    return parts.length ? parts.join(", ") : "N/A";
  }, [teacher]);

  if (loading) {
    return (
      <PageLayout pageBackground maxWidth="lg">
        <Box sx={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }
//
  if (error || !teacher) {
    return (
      <PageLayout pageBackground maxWidth="lg">
        <Alert severity="error">{error || "Teacher not found."}</Alert>
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
            { title: "Teachers", path: "/teachers" },
            { title: "Teacher Details", path: "#" },
          ]}
          homePath="/"
          actions={
            <PrimaryActionButton
              onClick={() => navigate(`/teachers/${teacher.id}/edit`)}
              icon={<EditIcon sx={{ fontSize: 20 }} />}
              label="Edit teacher"
            />
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
              height: "100%",
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
                src={teacher.photo_url || undefined}
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
                {teacher.full_name?.charAt(0) ?? "T"}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.4, lineHeight: 1.2, color: colorTokens.text.primary }}>
                {teacher.full_name}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mb: 1, color: colorTokens.text.secondary }}>
                Code: {teacher.teacher_code || "N/A"}
              </Typography>
              <StatusChip status={teacher.is_active ? "ACTIVE" : "INACTIVE"} />
            </Box>

            <Box sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                <PhoneIcon sx={{ fontSize: 18, color: colorTokens.text.secondary }} />
                <Typography variant="body2" sx={{ color: colorTokens.text.primary }}>{teacher.mobile_number || "N/A"}</Typography>
              </Box>
              <Divider sx={{ borderColor: colorTokens.border.default }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                <EmailIcon sx={{ fontSize: 18, color: colorTokens.text.secondary }} />
                <Typography variant="body2" sx={{ wordBreak: "break-word", textAlign: "left", color: colorTokens.text.primary }}>
                  {teacher.email || "N/A"}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: colorTokens.border.default }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                <CalendarMonthIcon sx={{ fontSize: 18, color: colorTokens.text.secondary }} />
                <Typography variant="body2" sx={{ color: colorTokens.text.primary }}>
                  Joined: {formatShortDate(teacher.created_at, { emptyPlaceholder: "N/A" })}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Updated ${formatShortDate(teacher.updated_at, { emptyPlaceholder: "N/A" })}`}
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
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, flex: 1 }}>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ borderColor: colorTokens.border.default, borderRadius: 1.5, boxShadow: "none", height: "100%" }}>
                    <SectionHeader title="Personal" icon={<PersonOutlineIcon fontSize="small" />} />
                    <DetailFieldRow label="Gender" dense labelMinWidth={120}>
                      <Typography variant="body2">{teacher.gender || "N/A"}</Typography>
                    </DetailFieldRow>
                    <DetailFieldRow label="Date of Birth" dense labelMinWidth={120} last>
                      <Typography variant="body2">
                        {formatShortDate(teacher.date_of_birth, { emptyPlaceholder: "N/A" })}
                      </Typography>
                    </DetailFieldRow>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ borderColor: colorTokens.border.default, borderRadius: 1.5, boxShadow: "none", height: "100%" }}>
                    <SectionHeader title="Contact" icon={<ContactPhoneIcon fontSize="small" />} />
                    <DetailFieldRow label="Mobile" dense labelMinWidth={120}>
                      <Typography variant="body2">{teacher.mobile_number || "N/A"}</Typography>
                    </DetailFieldRow>
                    <DetailFieldRow label="Email" dense labelMinWidth={120} last>
                      <Typography variant="body2">{teacher.email || "N/A"}</Typography>
                    </DetailFieldRow>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ borderColor: colorTokens.border.default, borderRadius: 1.5, boxShadow: "none", height: "100%" }}>
                    <SectionHeader title="Academic" icon={<SchoolIcon fontSize="small" />} />
                    <DetailFieldRow label="Qualification" dense labelMinWidth={120}>
                      <Typography variant="body2">{teacher.qualification || "N/A"}</Typography>
                    </DetailFieldRow>
                    <DetailFieldRow label="Experience" dense labelMinWidth={120} last>
                      <Typography variant="body2">
                        {teacher.experience_years != null ? `${teacher.experience_years} years` : "N/A"}
                      </Typography>
                    </DetailFieldRow>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ borderColor: colorTokens.border.default, borderRadius: 1.5, boxShadow: "none", height: "100%" }}>
                    <SectionHeader title="Assignment" icon={<AssignmentIndIcon fontSize="small" />} />
                    <DetailFieldRow label="Class/Division" dense labelMinWidth={120}>
                      <Typography variant="body2">{assignment}</Typography>
                    </DetailFieldRow>
                    <DetailFieldRow label="Status" dense labelMinWidth={120} last>
                      <Typography variant="body2">
                        {teacher.is_active ? "Active" : "Inactive"}
                      </Typography>
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
                  <Typography variant="body2">{teacher.city || "N/A"}</Typography>
                </DetailFieldRow>
                <DetailFieldRow label="State / Pincode" dense labelMinWidth={120} last>
                  <Typography variant="body2">
                    {teacher.state || "N/A"} {teacher.pincode ? `- ${teacher.pincode}` : ""}
                  </Typography>
                </DetailFieldRow>
              </Card>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </PageLayout>
  );
}
