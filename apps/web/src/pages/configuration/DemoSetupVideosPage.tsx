import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  ChevronRight as ChevronRightIcon,
  SmartDisplayOutlined as SmartDisplayOutlinedIcon,
} from "@mui/icons-material";

import { PageHeader } from "../../components/layout";
import { ListPageLayout, ListPageToolbar } from "../../components/reusable";
import { useRBAC } from "../../context/RBACContext";
import { colorTokens } from "../../tokens/colors";
import demoVideoService, { DemoVideoRecord } from "../../api/services/demoVideoService";

export default function DemoSetupVideosPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { hasPermission, hasAnyRole } = useRBAC();
  const isSystemAdmin = hasAnyRole(["SUPER_ADMIN", "SYSTEM_ADMIN"]);
  const canCreate = isSystemAdmin || hasPermission("DEMO_SETUP_MGMT:create");
  const canEdit = isSystemAdmin || hasPermission("DEMO_SETUP_MGMT:edit");
  const canDelete = isSystemAdmin || hasPermission("DEMO_SETUP_MGMT:delete");

  const [items, setItems] = useState<DemoVideoRecord[]>([]);
  const [selectedModuleKey, setSelectedModuleKey] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(id ? Number(id) : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await demoVideoService.list();
      setItems(data);
      if (data.length === 0) {
        setSelectedModuleKey("");
        setSelectedVideoId(null);
        return;
      }

      const preferredId = selectedVideoId ?? (id ? Number(id) : null);
      const preferredVideo = preferredId ? data.find((row) => row.id === preferredId) : null;

      if (preferredVideo) {
        setSelectedModuleKey(preferredVideo.module_key);
        setSelectedVideoId(preferredVideo.id);
      } else if (!selectedModuleKey) {
        setSelectedModuleKey(data[0].module_key);
        setSelectedVideoId(data[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load demo videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  useEffect(() => {
    if (id) {
      const parsed = Number(id);
      if (!Number.isNaN(parsed)) {
        setSelectedVideoId(parsed);
      }
    }
  }, [id]);

  const modules = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    items.forEach((item) => {
      const existing = map.get(item.module_key);
      if (existing) {
        map.set(item.module_key, { ...existing, count: existing.count + 1 });
        return;
      }
      map.set(item.module_key, { name: item.module_name, count: 1 });
    });
    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
  }, [items]);

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (module) =>
        module.name.toLowerCase().includes(q) ||
        module.key.toLowerCase().includes(q)
    );
  }, [modules, search]);

  const selectedVideo = useMemo(
    () => items.find((item) => item.id === selectedVideoId) ?? null,
    [items, selectedVideoId]
  );

  const embedUrl = useMemo(() => {
    const raw = selectedVideo?.video_url?.trim() || "";
    if (!raw) return "";
    if (raw.includes("youtube.com/watch?v=")) {
      const parsed = new URL(raw);
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (raw.includes("youtu.be/")) {
      const videoId = raw.split("youtu.be/")[1]?.split("?")[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    return raw;
  }, [selectedVideo]);

  const onDelete = async (id: number) => {
    setError(null);
    try {
      await demoVideoService.delete(id);
      await loadItems();
      if (selectedVideoId === id) {
        const next = items.find((item) => item.module_key === selectedModuleKey && item.id !== id);
        setSelectedVideoId(next?.id ?? null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete demo video");
    }
  };

  const selectedModule = useMemo(
    () => modules.find((module) => module.key === selectedModuleKey) ?? null,
    [modules, selectedModuleKey]
  );

  return (
    <ListPageLayout
      pageBackground
      header={
        <PageHeader
          links={[{ title: "Demo Setup Videos", path: "/demo-setup-videos" }]}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search modules..."
              onAddClick={canCreate ? () => navigate("/demo-setup-videos/new") : undefined}
              addLabel="Add Demo Setup"
              addIcon={<AddIcon sx={{ fontSize: 22 }} />}
            />
          }
        />
      }
    >
      <Stack spacing={1.25}>
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
          <Paper
            sx={{
              width: { xs: "100%", lg: 330 },
              flexShrink: 0,
              p: 0,
              borderRadius: "16px",
              border: `1px solid ${colorTokens.border.default}`,
              alignSelf: "stretch",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(2, 6, 23, 0.08)",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            }}
          >
            <Box
              sx={{
                p: 2,
                borderBottom: `1px solid ${colorTokens.border.default}`,
                background: `linear-gradient(180deg, ${alpha(colorTokens.primary.main, 0.08)} 0%, rgba(255,255,255,0) 100%)`,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Course Modules
              </Typography>
            </Box>
            <List disablePadding sx={{ maxHeight: 620, overflowY: "auto" }}>
              {filteredModules.map((module) => {
                const active = module.key === selectedModuleKey;
                return (
                  <ListItemButton
                    key={module.key}
                    onClick={() => {
                      setSelectedModuleKey(module.key);
                      const first = items.find((item) => item.module_key === module.key);
                      setSelectedVideoId(first?.id ?? null);
                    }}
                    sx={{
                      px: 2,
                      py: 1.35,
                      borderBottom: `1px solid ${colorTokens.border.default}`,
                      bgcolor: active ? alpha(colorTokens.primary.main, 0.08) : "transparent",
                      transition: "all .2s ease",
                      "&:hover": {
                        bgcolor: alpha(colorTokens.primary.main, 0.05),
                      },
                    }}
                  >
                    <ListItemText
                      primary={module.name}
                      primaryTypographyProps={{ fontWeight: active ? 800 : 700, fontSize: "0.95rem" }}
                    />
                    <ChevronRightIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                  </ListItemButton>
                );
              })}
            </List>

            {canCreate ? (
              <Box sx={{ p: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate("/demo-setup-videos/new")}
                  sx={{
                    borderRadius: "12px",
                    py: 1,
                    fontWeight: 700,
                    textTransform: "none",
                    background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                    boxShadow: "0 10px 18px rgba(37, 99, 235, 0.3)",
                    "&:hover": {
                      boxShadow: "0 14px 22px rgba(37, 99, 235, 0.35)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  Add Module Demo
                </Button>
              </Box>
            ) : null}
          </Paper>

          <Paper
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: "16px",
              border: `1px solid ${colorTokens.border.default}`,
              boxShadow: "0 10px 30px rgba(2, 6, 23, 0.08)",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
              overflow: "hidden",
            }}
          >
            {loading ? (
              <Typography color="text.secondary">Loading videos...</Typography>
            ) : !selectedVideo ? (
              <Typography color="text.secondary">
                Select a module from the left panel to view setup details.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 900, fontSize: "1.7rem", mb: 0.25 }}>
                    {selectedVideo.title}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary", mb: 0.75 }}>
                    <SmartDisplayOutlinedIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">Video Lesson</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                    {selectedVideo.description || "No description provided."}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 0.75 }}>
                    {canEdit ? (
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          borderRadius: "10px",
                          fontWeight: 700,
                          textTransform: "none",
                          bgcolor: alpha(colorTokens.primary.main, 0.06),
                          "&:hover": { bgcolor: alpha(colorTokens.primary.main, 0.12) },
                        }}
                        onClick={() => navigate(`/demo-setup-videos/${selectedVideo.id}/edit`)}
                      >
                        Edit
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        color="error"
                        variant="outlined"
                        size="small"
                        sx={{
                          borderRadius: "10px",
                          fontWeight: 700,
                          textTransform: "none",
                          bgcolor: alpha(colorTokens.error.main, 0.05),
                          "&:hover": { bgcolor: alpha(colorTokens.error.main, 0.12) },
                        }}
                        onClick={() => void onDelete(selectedVideo.id)}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </Stack>
                </Box>

                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: "14px",
                    borderColor: colorTokens.border.default,
                    overflow: "hidden",
                    boxShadow: "0 14px 34px rgba(2, 6, 23, 0.16)",
                    maxWidth: 900,
                    mx: "auto",
                    width: "100%",
                  }}
                >
                  <Box
                    component="iframe"
                    src={embedUrl}
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    sx={{
                      width: "100%",
                      aspectRatio: "16 / 9",
                      height: "auto",
                      maxHeight: "52vh",
                      border: 0,
                      transition: "opacity .2s ease, transform .2s ease",
                    }}
                  />
                </Paper>
              </Stack>
            )}
          </Paper>
        </Stack>
      </Stack>
    </ListPageLayout>
  );
}
