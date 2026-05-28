import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";

import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import demoVideoService, { DemoVideoRecord } from "../../api/services/demoVideoService";

function toEmbedUrl(raw: string): string {
  const url = raw.trim();
  if (url.includes("youtube.com/watch?v=")) {
    const parsed = new URL(url);
    const id = parsed.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  return url;
}

export default function DemoSetupVideoDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<DemoVideoRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const result = await demoVideoService.getById(Number(id));
        setItem(result);
      } catch (err: any) {
        setError(err?.message || "Failed to load demo video");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const embedUrl = useMemo(() => (item ? toEmbedUrl(item.video_url) : ""), [item]);

  return (
    <ListPageLayout
      pageBackground
      header={<PageHeader links={[{ title: "Demo Setup Videos", path: "/demo-setup-videos" }]} homePath="/" />}
    >
      <Paper sx={{ p: 2 }}>
        <Button onClick={() => navigate("/demo-setup-videos")}>Back to list</Button>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {loading ? <Typography color="text.secondary">Loading...</Typography> : null}
        {item ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {item.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {item.description || "No description provided."}
            </Typography>
            <Box
              component="iframe"
              src={embedUrl}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sx={{ width: "100%", minHeight: 420, border: 0, borderRadius: 1 }}
            />
          </Box>
        ) : null}
      </Paper>
    </ListPageLayout>
  );
}
