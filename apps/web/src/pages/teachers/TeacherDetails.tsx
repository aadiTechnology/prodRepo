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
  Tabs, 
  Tab,
  CircularProgress,
  Paper
} from "@mui/material";
import { 
  ArrowBack as BackIcon, 
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Class as ClassIcon
} from "@mui/icons-material";
import teacherService, { type TeacherResponse } from "../../api/services/teacherService";
import { PageHeader } from "../../components/layout";
import StatusChip from "../../components/roles/StatusChip";
import { formatShortDate } from "../../utils/formatters";
import DetailFieldRow from "../../components/reusable/DetailFieldRow";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function TeacherDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [teacher, setTeacher] = useState<TeacherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

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

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !teacher) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="error">{error || "Teacher not found"}</Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate("/teachers")} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 5 }}>
      <PageHeader
        links={[
          { title: "Teachers", path: "/teachers" },
          { title: `${teacher.full_name} (${teacher.teacher_code})`, path: "#" },
        ]}
        homePath="/"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<BackIcon />}
              onClick={() => navigate("/teachers")}
            >
              Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/teachers/${teacher.id}/edit`)}
            >
              Edit
            </Button>
          </Box>
        }
      />

      <Grid container spacing={3} sx={{ mt: 1, px: { xs: 2, md: 3 } }}>
        {/* Profile Summary Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, textAlign: "center", height: "100%" }}>
            <Avatar
              src={teacher.photo_url || ""}
              sx={{ width: 120, height: 120, mx: "auto", mb: 2, border: "4px solid", borderColor: "primary.main" }}
            >
              {teacher.full_name.charAt(0)}
            </Avatar>
            <Typography variant="h5" gutterBottom>
              {teacher.full_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ID: {teacher.teacher_code}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <StatusChip status={teacher.is_active ? "ACTIVE" : "INACTIVE"} />
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ textAlign: "left" }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <PhoneIcon sx={{ mr: 2, color: "text.secondary", fontSize: 20 }} />
                <Typography variant="body2">{teacher.mobile_number}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <EmailIcon sx={{ mr: 2, color: "text.secondary", fontSize: 20 }} />
                <Typography variant="body2">{teacher.email || "N/A"}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <LocationIcon sx={{ mr: 2, color: "text.secondary", fontSize: 20 }} />
                <Typography variant="body2">
                  {teacher.city ? `${teacher.city}, ${teacher.state || ""}` : "Location N/A"}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Detailed Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="teacher detail tabs">
                <Tab label="Profile" />
                <Tab label="Attendance" />
                <Tab label="Salary" />
                <Tab label="Documents" />
              </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "primary.main" }}>
                  Personal Details
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <DetailFieldRow label="Gender">{teacher.gender || "N/A"}</DetailFieldRow>
                    <DetailFieldRow label="Date of Birth">{teacher.date_of_birth ? formatShortDate(teacher.date_of_birth) : "N/A"}</DetailFieldRow>
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 4, mb: 2, color: "primary.main" }}>
                  Professional Details
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <DetailFieldRow label="Qualification">{teacher.qualification || "N/A"}</DetailFieldRow>
                    <DetailFieldRow label="Experience">{teacher.experience_years ? `${teacher.experience_years} Years` : "N/A"}</DetailFieldRow>
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 4, mb: 2, color: "primary.main" }}>
                  Class Assignment
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <DetailFieldRow label="Class">{teacher.class_name || "N/A"}</DetailFieldRow>
                    <DetailFieldRow label="Division">{teacher.division_name || "N/A"}</DetailFieldRow>
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 4, mb: 2, color: "primary.main" }}>
                  Address Details
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <DetailFieldRow label="Full Address">{teacher.address || "N/A"}</DetailFieldRow>
                    <DetailFieldRow label="City">{teacher.city || "N/A"}</DetailFieldRow>
                    <DetailFieldRow label="State">{teacher.state || "N/A"}</DetailFieldRow>
                    <DetailFieldRow label="Pincode" last>{teacher.pincode || "N/A"}</DetailFieldRow>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography variant="body1" color="text.secondary">
                  Attendance tracking module is currently under development.
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography variant="body1" color="text.secondary">
                  Salary and payroll management will be available in the next update.
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography variant="body1" color="text.secondary">
                  No documents uploaded yet.
                </Typography>
              </Box>
            </TabPanel>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
