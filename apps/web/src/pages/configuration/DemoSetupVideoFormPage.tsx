import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, Switch, TextField, Typography } from "@mui/material";

import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import demoVideoService from "../../api/services/demoVideoService";

type FormState = {
  module_name: string;
  title: string;
  video_url: string;
  description: string;
  is_active: boolean;
};

const INITIAL_STATE: FormState = {
  module_name: "",
  title: "",
  video_url: "",
  description: "",
  is_active: true,
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function DemoSetupVideoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = useMemo(() => Boolean(id), [id]);

  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!isEditMode || !id) return;
      setLoading(true);
      setError(null);
      try {
        const row = await demoVideoService.getById(Number(id));
        setFormData({
          module_name: row.module_name,
          title: row.title,
          video_url: row.video_url,
          description: row.description || "",
          is_active: row.is_active,
        });
      } catch (err: any) {
        setError(err?.message || "Failed to load demo setup");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, isEditMode]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        module_name: formData.module_name.trim(),
        module_key: slugify(formData.module_name),
        title: formData.title.trim(),
        video_url: formData.video_url.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };

      if (isEditMode && id) {
        await demoVideoService.update(Number(id), payload);
      } else {
        await demoVideoService.create(payload);
      }
      navigate("/demo-setup-videos");
    } catch (err: any) {
      setError(err?.message || "Failed to save demo setup");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ListPageLayout
      pageBackground
      header={
        <PageHeader
          links={[
            { title: "Demo Setup Videos", path: "/demo-setup-videos" },
            { title: isEditMode ? "Edit Demo Setup" : "Create Demo Setup", path: "#" },
          ]}
          homePath="/"
        />
      }
    >
      <Paper sx={{ p: 2.5 }}>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {loading ? (
          <Typography color="text.secondary">Loading...</Typography>
        ) : (
          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Module Name"
                value={formData.module_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    module_name: e.target.value,
                  }))
                }
                required
                fullWidth
                size="small"
              />

              <TextField
                label="Demo Title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
                size="small"
              />

              <TextField
                label="Video URL"
                value={formData.video_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, video_url: e.target.value }))}
                required
                size="small"
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                multiline
                minRows={4}
              />

              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2">Active</Typography>
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => navigate("/demo-setup-videos")} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="contained" type="submit" disabled={saving}>
                  {isEditMode ? "Update Demo Setup" : "Create Demo Setup"}
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Paper>
    </ListPageLayout>
  );
}
