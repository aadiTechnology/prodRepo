import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Paper,
  alpha,
  styled,
} from "@mui/material";
import {
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  YouTube as YouTubeIcon,
  WhatsApp as WhatsAppIcon,
  Language as LanguageIcon,
  Campaign as CampaignIcon,
  Brush as BrushIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Launch as LaunchIcon,
  Google as GoogleIcon,
  RateReview as RateReviewIcon,
  AdsClick as AdsClickIcon,
  Article as ArticleIcon,
} from "@mui/icons-material";
import { PageHeader } from "../../components/layout";
import marketingHubService, { MarketingHubConfig } from "../../api/services/marketingHubService";

// Styled Components
const PremiumCard = styled(Card)(({ theme }) => ({
  borderRadius: "24px",
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.02)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  overflow: "hidden",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  "&:hover": {
    transform: "translateY(-6px)",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)",
    borderColor: alpha(theme.palette.primary.main, 0.2),
  },
}));

const IconWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "colorHex",
})<{ colorHex?: string }>(({ theme, colorHex }) => {
  const brandColor = colorHex || theme.palette.primary.main;
  return {
    width: "56px",
    height: "56px",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha(brandColor, 0.1),
    color: brandColor,
    marginBottom: theme.spacing(2),
  };
});

const BrandGradients: Record<string, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  youtube: "#FF0000",
  whatsapp: "#25D366",
  google_ads: "#4285F4",
  meta_ads: "#0064E0",
  email_campaign: "#FF5A5F",
  canva: "#00C4CC",
  brochure: "#FF9F1C",
  school_website: "#009688",
  google_review: "#F4B400",
  default: "#7C4DFF",
};

// Platform Icon mapping
const getPlatformIcon = (code: string) => {
  switch (code.toLowerCase()) {
    case "instagram":
      return <InstagramIcon fontSize="large" />;
    case "facebook":
      return <FacebookIcon fontSize="large" />;
    case "youtube":
      return <YouTubeIcon fontSize="large" />;
    case "whatsapp":
      return <WhatsAppIcon fontSize="large" />;
    case "google_ads":
    case "google_review":
      return <GoogleIcon fontSize="large" />;
    case "meta_ads":
      return <AdsClickIcon fontSize="large" />;
    case "email_campaign":
      return <CampaignIcon fontSize="large" />;
    case "canva":
      return <BrushIcon fontSize="large" />;
    case "brochure":
      return <ArticleIcon fontSize="large" />;
    case "school_website":
    default:
      return <LanguageIcon fontSize="large" />;
  }
};

const CATEGORIES = [
  "All Platforms",
  "Social Media",
  "Advertising",
  "Communication",
  "Branding",
  "Website & Reviews",
];

/** Normalize integration URLs to HTTPS within this module only. */
const normalizeIntegrationUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (/^https:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^http:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, "https://");
  }

  return `https://${trimmed.replace(/^\/\//, "")}`;
};

const validateIntegrationUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = normalizeIntegrationUrl(trimmed);

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:") {
      return "URL must use HTTPS.";
    }
    if (!parsed.hostname) {
      return "Enter a valid HTTPS URL.";
    }
    return null;
  } catch {
    return "Enter a valid HTTPS URL (e.g. https://example.com).";
  }
};

const DigitalMarketingHub = () => {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [platformConfig, setPlatformConfig] = useState<MarketingHubConfig[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [editedUrls, setEditedUrls] = useState<Record<number, string>>({});
  const [editedActives, setEditedActives] = useState<Record<number, boolean>>({});

  // Custom Platform Modal State
  const [openModal, setOpenModal] = useState(false);
  const [newPlatform, setNewPlatform] = useState({
    name: "",
    code: "",
    category: "Social Media",
    description: "",
    icon_url: "",
    sort_order: 10,
  });

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await marketingHubService.getMarketingConfig();
      const normalizedData = data.map((p) => ({
        ...p,
        url: p.url ? normalizeIntegrationUrl(p.url) : p.url,
      }));
      setPlatformConfig(normalizedData);
      // Initialize inputs state
      const urls: Record<number, string> = {};
      const actives: Record<number, boolean> = {};
      normalizedData.forEach((p) => {
        urls[p.platform_id] = p.url || "";
        actives[p.platform_id] = p.link_active ?? true;
      });
      setEditedUrls(urls);
      setEditedActives(actives);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load marketing configurations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (platformId: number) => {
    setSavingId(platformId);
    try {
      const url = editedUrls[platformId];
      const isActive = editedActives[platformId];
      const trimmedUrl = url.trim();

      if (trimmedUrl) {
        const validationError = validateIntegrationUrl(trimmedUrl);
        if (validationError) {
          setError(validationError);
          setSavingId(null);
          return;
        }
      }

      const normalizedUrl = trimmedUrl ? normalizeIntegrationUrl(trimmedUrl) : trimmedUrl;

      await marketingHubService.saveMarketingLink({
        platform_id: platformId,
        url: normalizedUrl,
        is_active: isActive,
      });

      setEditedUrls((prev) => ({
        ...prev,
        [platformId]: normalizedUrl,
      }));

      // Update local state config
      setPlatformConfig((prev) =>
        prev.map((p) =>
          p.platform_id === platformId
            ? { ...p, url: normalizedUrl, link_active: isActive }
            : p
        )
      );
      setSuccess("Link configured successfully!");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save link configuration");
    } finally {
      setSavingId(null);
    }
  };

  const handleCreatePlatform = async () => {
    if (!newPlatform.name || !newPlatform.code) {
      setError("Name and Code are required");
      return;
    }
    try {
      await marketingHubService.createPlatform({
        ...newPlatform,
        sort_order: Number(newPlatform.sort_order),
      });
      setSuccess("New platform added to catalog!");
      setOpenModal(false);
      setNewPlatform({
        name: "",
        code: "",
        category: "Social Media",
        description: "",
        icon_url: "",
        sort_order: 10,
      });
      fetchConfig();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to add platform");
    }
  };

  // Filtered platforms by active category tab
  const filteredPlatforms = useMemo(() => {
    const activeCat = CATEGORIES[selectedTab];
    if (activeCat === "All Platforms") return platformConfig;
    return platformConfig.filter((p) => p.category === activeCat);
  }, [platformConfig, selectedTab]);

  const breadcrumbs = [
    { title: "Dashboard", path: "/" },
    { title: "Digital Marketing Hub", path: "#" },
  ];

  return (
    <Box sx={{ p: 4, minHeight: "100%", backgroundColor: "neutral.50" }}>
      <PageHeader
        links={breadcrumbs}
        homePath="/"
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
            sx={{
              borderRadius: "15px",
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
            }}
          >
            Add Platform
          </Button>
        }
      />

      {/* Tabs list for Categories */}
      <Paper
        sx={{
          borderRadius: "20px",
          p: 1,
          mb: 4,
          boxShadow: "0 4px 20px rgba(0,0,0,0.01)",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Tabs
          value={selectedTab}
          onChange={(_, val) => setSelectedTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTabs-indicator": {
              height: "4px",
              borderRadius: "2px",
            },
            "& .MuiTab-root": {
              fontWeight: 700,
              textTransform: "none",
              fontSize: "0.9rem",
              minHeight: "48px",
            },
          }}
        >
          {CATEGORIES.map((cat, idx) => (
            <Tab key={idx} label={cat} />
          ))}
        </Tabs>
      </Paper>

      {/* Platforms Grid */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={50} />
        </Box>
      ) : filteredPlatforms.length === 0 ? (
        <Box sx={{ textAlignment: "center", py: 8 }}>
          <Typography color="text.secondary" variant="h6" align="center">
            No marketing platforms configured in this category yet.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredPlatforms.map((platform) => {
            const platformId = platform.platform_id;
            const urlValue = editedUrls[platformId] || "";
            const activeValue = editedActives[platformId] ?? true;
            const savedUrl = platform.url || "";
            const normalizedUrlValue = urlValue.trim() ? normalizeIntegrationUrl(urlValue) : urlValue.trim();
            const isModified =
              normalizedUrlValue !== savedUrl || activeValue !== (platform.link_active ?? true);
            const brandColor = BrandGradients[platform.code] || BrandGradients.default;

            return (
              <Grid item xs={12} sm={6} md={4} key={platformId}>
                <PremiumCard>
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <IconWrapper colorHex={brandColor}>
                        {getPlatformIcon(platform.code)}
                      </IconWrapper>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={activeValue}
                            onChange={(e) =>
                              setEditedActives((prev) => ({
                                ...prev,
                                [platformId]: e.target.checked,
                              }))
                            }
                            color="success"
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {activeValue ? "Active" : "Inactive"}
                          </Typography>
                        }
                        labelPlacement="start"
                        sx={{ m: 0 }}
                      />
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                      {platform.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: "40px", mb: 2 }}>
                      {platform.description || `Integrate and route to your school's ${platform.name} channel.`}
                    </Typography>

                    <TextField
                      fullWidth
                      size="small"
                      label="Integration Link (HTTPS URL)"
                      placeholder="https://example.com"
                      value={urlValue}
                      onChange={(e) =>
                        setEditedUrls((prev) => ({
                          ...prev,
                          [platformId]: e.target.value,
                        }))
                      }
                      onBlur={() => {
                        const current = editedUrls[platformId] || "";
                        if (!current.trim()) return;
                        const normalized = normalizeIntegrationUrl(current);
                        if (normalized !== current) {
                          setEditedUrls((prev) => ({
                            ...prev,
                            [platformId]: normalized,
                          }));
                        }
                      }}
                      helperText="HTTPS only. Bare domains are auto-prefixed with https://."
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "12px",
                        },
                      }}
                    />
                  </CardContent>

                  <CardActions sx={{ px: 3, pb: 3, pt: 0, justifyContent: "space-between" }}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      disabled={!savedUrl}
                      onClick={() => window.open(normalizeIntegrationUrl(savedUrl), "_blank", "noopener,noreferrer")}
                      startIcon={<LaunchIcon />}
                      sx={{
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: 700,
                        px: 2,
                      }}
                    >
                      Visit
                    </Button>

                    <Button
                      variant="contained"
                      color={isModified ? "primary" : "inherit"}
                      disabled={!isModified || savingId === platformId}
                      onClick={() => handleSave(platformId)}
                      startIcon={savingId === platformId ? <CircularProgress size={16} /> : <SaveIcon />}
                      sx={{
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: 700,
                        px: 2.5,
                      }}
                    >
                      Save
                    </Button>
                  </CardActions>
                </PremiumCard>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add Custom Platform Dialog */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        PaperProps={{
          sx: { borderRadius: "24px", p: 1, maxWidth: "500px" },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Add Platform to Catalog</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Platform Name"
                placeholder="e.g. TikTok"
                value={newPlatform.name}
                onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Unique Code Key"
                placeholder="e.g. tiktok"
                value={newPlatform.code}
                onChange={(e) => setNewPlatform({ ...newPlatform, code: e.target.value })}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Category"
                SelectProps={{ native: true }}
                value={newPlatform.category}
                onChange={(e) => setNewPlatform({ ...newPlatform, category: e.target.value })}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              >
                {CATEGORIES.slice(1).map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                placeholder="Short description of the platform"
                value={newPlatform.description}
                onChange={(e) => setNewPlatform({ ...newPlatform, description: e.target.value })}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sort Order"
                type="number"
                value={newPlatform.sort_order}
                onChange={(e) => setNewPlatform({ ...newPlatform, sort_order: Number(e.target.value) })}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenModal(false)} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreatePlatform}
            sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}
          >
            Add Platform
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ borderRadius: "12px", width: "100%" }}>
          {success}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ borderRadius: "12px", width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DigitalMarketingHub;
