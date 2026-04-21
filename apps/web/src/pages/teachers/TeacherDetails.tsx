import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  Paper,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Class as ClassIcon,
  PersonOutline as PersonOutlineIcon,
  MenuBookOutlined as MenuBookOutlinedIcon,
  HomeOutlined as HomeOutlinedIcon,
  EventAvailableOutlined as EventAvailableOutlinedIcon,
  PaymentsOutlined as PaymentsOutlinedIcon,
  FolderOpenOutlined as FolderOpenOutlinedIcon,
} from "@mui/icons-material";
import teacherService, { type TeacherResponse } from "../../api/services/teacherService";
import { PageHeader, PageLayout } from "../../components/layout";
import StatusChip from "../../components/roles/StatusChip";
import { formatShortDate } from "../../utils/formatters";
import DetailFieldRow from "../../components/reusable/DetailFieldRow";
import HeaderIconAction from "../../components/reusable/HeaderIconAction";
import { colorTokens } from "../../tokens/colors";

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        borderRadius: 2,
        overflow: "hidden",
        borderColor: theme.palette.divider,
      })}
    >
      <Box
        sx={(theme) => ({
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(colorTokens.primary.main, 0.04),
        })}
      >
        <Box
          sx={(theme) => ({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colorTokens.primary.main,
            "& .MuiSvgIcon-root": { fontSize: 20 },
          })}
        >
          {icon}
        </Box>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
          {title}
        </Typography>
      </Box>
      <Box>{children}</Box>
    </Paper>
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
    try {
      const data = await teacherService.getById(Number(id));
      setTeacher(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load teacher details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTeacher();
  }, [fetchTeacher]);

  if (loading) {
    return (
      <PageLayout pageBackground maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 360,
          }}
        >
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  if (error || !teacher) {
    return (
      <PageLayout pageBackground maxWidth="lg">
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography color="error" gutterBottom>
            {error || "Teacher not found"}
          </Typography>
          <Button startIcon={<BackIcon />} onClick={() => navigate("/teachers")} sx={{ mt: 2 }}>
            Back to List
          </Button>
        </Box>
      </PageLayout>
    );
  }

  const rowProps = { dense: true as const, labelMinWidth: 140 };

  return (
    <PageLayout pageBackground maxWidth="lg" spacing={2}>
      <PageHeader
        links={[
          { title: "Teachers", path: "/teachers" },
          { title: teacher.full_name, path: "#" },
        ]}
        homePath="/"
        actions={
          <Box sx={{ display: "flex", gap: 0.75 }}>
            <HeaderIconAction
              aria-label="Back to teachers"
              tooltip="Back to teachers"
              icon={<BackIcon fontSize="small" />}
              tone="neutral"
              onClick={() => navigate("/teachers")}
            />
            <HeaderIconAction
              aria-label="Edit teacher"
              tooltip="Edit teacher"
              icon={<EditIcon fontSize="small" />}
              tone="primary"
              onClick={() => navigate(`/teachers/${teacher.id}/edit`)}
            />
          </Box>
        }
      />

      <Grid
        container
        spacing={{ xs: 1.5, md: 2 }}
        sx={{
          alignItems: "flex-start",
        }}
      >
        <Grid item xs={12} md={4} lg={4}>
          <Card
            sx={(theme) => ({
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
              border: `1px solid ${colorTokens.border.default}`,
              boxShadow: theme.shadows[1],
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(90deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
              },
            })}
          >
            <Box sx={{ p: 2.5, pt: 3, textAlign: "center", flex: 1, display: "flex", flexDirection: "column" }}>
              <Avatar
                src={teacher.photo_url || ""}
                sx={(theme) => ({
                  width: 92,
                  height: 92,
                  mx: "auto",
                  mb: 1.5,
                  fontSize: "1.75rem",
                  fontWeight: 600,
                  border: `3px solid ${alpha(colorTokens.primary.main, 0.35)}`,
                  boxShadow: `0 8px 24px ${alpha(colorTokens.primary.main, 0.18)}`,
                })}
              >
                {teacher.full_name.charAt(0)}
              </Avatar>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }} gutterBottom>
                {teacher.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Code {teacher.teacher_code ?? "—"}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                <StatusChip status={teacher.is_active ? "ACTIVE" : "INACTIVE"} />
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <StackRow icon={<PhoneIcon sx={{ fontSize: 18 }} />} text={teacher.mobile_number} />
              <StackRow icon={<EmailIcon sx={{ fontSize: 18 }} />} text={teacher.email || "No email on file"} />
              <StackRow
                icon={<LocationIcon sx={{ fontSize: 18 }} />}
                text={
                  teacher.city ? `${teacher.city}${teacher.state ? `, ${teacher.state}` : ""}` : "Location not set"
                }
                last
              />

              <Box sx={{ mt: "auto", pt: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                  Last updated
                  {teacher.updated_at
                    ? ` ${formatShortDate(teacher.updated_at)}`
                    : teacher.created_at
                      ? ` ${formatShortDate(teacher.created_at)}`
                      : " —"}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={8} lg={8}>
          <Card
            sx={(theme) => ({
              border: `1px solid ${colorTokens.border.default}`,
              boxShadow: theme.shadows[1],
              p: { xs: 1.5, sm: 2, md: 1.75 },
            })}
          >
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                Teacher Profile Overview
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                All core information is visible in a single view without inner scrolling.
              </Typography>
            </Box>

            <Grid container spacing={{ xs: 1.25, md: 1.5 }} sx={{ alignItems: "flex-start" }}>
              <Grid item xs={12} sm={6}>
                <SectionCard title="Personal" icon={<PersonOutlineIcon />}>
                  <DetailFieldRow label="Gender" {...rowProps}>
                    {teacher.gender || "N/A"}
                  </DetailFieldRow>
                  <DetailFieldRow label="Date of birth" last {...rowProps}>
                    {teacher.date_of_birth ? formatShortDate(teacher.date_of_birth) : "N/A"}
                  </DetailFieldRow>
                </SectionCard>
              </Grid>
              <Grid item xs={12} sm={6}>
                <SectionCard title="Professional" icon={<MenuBookOutlinedIcon />}>
                  <DetailFieldRow label="Qualification" {...rowProps}>
                    {teacher.qualification || "N/A"}
                  </DetailFieldRow>
                  <DetailFieldRow label="Experience" last {...rowProps}>
                    {teacher.experience_years != null ? `${teacher.experience_years} years` : "N/A"}
                  </DetailFieldRow>
                </SectionCard>
              </Grid>
              <Grid item xs={12} sm={6}>
                <SectionCard title="Class assignment" icon={<ClassIcon />}>
                  <DetailFieldRow label="Class" {...rowProps}>
                    {teacher.class_name || "N/A"}
                  </DetailFieldRow>
                  <DetailFieldRow label="Division" last {...rowProps}>
                    {teacher.division_name || "N/A"}
                  </DetailFieldRow>
                </SectionCard>
              </Grid>
              <Grid item xs={12} sm={6}>
                <SectionCard title="Address" icon={<HomeOutlinedIcon />}>
                  <DetailFieldRow label="Street / full address" {...rowProps}>
                    {teacher.address || "N/A"}
                  </DetailFieldRow>
                  <DetailFieldRow label="City" {...rowProps}>
                    {teacher.city || "N/A"}
                  </DetailFieldRow>
                  <DetailFieldRow label="State" {...rowProps}>
                    {teacher.state || "N/A"}
                  </DetailFieldRow>
                  <DetailFieldRow label="Pincode" last {...rowProps}>
                    {teacher.pincode || "N/A"}
                  </DetailFieldRow>
                </SectionCard>
              </Grid>
            </Grid>

            <Paper
              variant="outlined"
              sx={(theme) => ({
                mt: 1.5,
                borderRadius: 1.75,
                pt: 1,
                pb: 1,
                px: 1.25,
                borderColor: theme.palette.divider,
                bgcolor: alpha(colorTokens.primary.main, 0.02),
              })}
            >
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                <Chip icon={<EventAvailableOutlinedIcon />} label="Attendance module pending" size="small" variant="outlined" />
                <Chip icon={<PaymentsOutlinedIcon />} label="Payroll module pending" size="small" variant="outlined" />
                <Chip icon={<FolderOpenOutlinedIcon />} label="Documents module pending" size="small" variant="outlined" />
              </Box>
            </Paper>
          </Card>
        </Grid>
      </Grid>
    </PageLayout>
  );
}

function StackRow({
  icon,
  text,
  last,
}: {
  icon: React.ReactNode;
  text: string;
  last?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        py: 1.25,
        borderBottom: last ? "none" : "1px solid",
        borderColor: "divider",
        textAlign: "left",
      }}
    >
      <Box sx={{ color: "text.secondary", mt: 0.15, flexShrink: 0 }}>{icon}</Box>
      <Typography variant="body2" sx={{ wordBreak: "break-word", minWidth: 0 }}>
        {text}
      </Typography>
    </Box>
  );
}
