/**
 * Theme Studio — Theme Template Manager
 * Edit design tokens, create/save/load theme templates, and export tenant theme configuration.
 *
 * Left: Template list + Token editor. Right: Live UI preview.
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  ThemeProvider,
  CssBaseline,
  Stack,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { createAppTheme } from "../../theme/themeBuilder";
import { mergeTokenOverrides } from "../../theme/themeStudio/mergeTokenOverrides";
import { buildExportConfig, downloadThemeConfig } from "../../theme/themeStudio/buildExportConfig";
import { tokens } from "../../tokens";
import type { Tokens } from "../../tokens";
import { PageHeader } from "../../components/layout";
import { AppCard } from "../../components/primitives";
import { DataTable } from "../../components/reusable";
import themeTemplateService from "../../api/services/themeTemplateService";
import type { ThemeTemplate } from "../../types/themeTemplate";

// --- Token override state type (partial tokens we allow editing) ---
type StudioOverrides = Partial<Tokens>;

const defaultOverrides: StudioOverrides = {};

// --- Helpers to get effective value (override or default) ---
function getEffectiveColors(ov: StudioOverrides) {
  return { ...tokens.colors, ...ov.colors } as Tokens["colors"];
}
function getEffectiveTypography(ov: StudioOverrides) {
  return { ...tokens.typography, ...ov.typography } as Tokens["typography"];
}
function getEffectiveSpacing(ov: StudioOverrides) {
  const s = ov.spacing;
  return {
    ...tokens.spacing,
    ...s,
    tokens: { ...tokens.spacing.tokens, ...(s?.tokens ?? {}) },
  };
}
function getEffectiveRadius(ov: StudioOverrides) {
  const r = ov.radius;
  return {
    tokens: { ...tokens.radius.tokens, ...r?.tokens },
    semantic: { ...tokens.radius.semantic, ...r?.semantic },
  };
}
function getEffectiveElevation(ov: StudioOverrides) {
  const e = ov.elevation;
  return {
    tokens: { ...tokens.elevation.tokens, ...e?.tokens },
    semantic: { ...tokens.elevation.semantic, ...e?.semantic },
  };
}

// --- Left panel: Token Editor ---
function TokenEditor({
  overrides,
  onChange,
}: {
  overrides: StudioOverrides;
  onChange: (next: StudioOverrides) => void;
}) {
  const colors = getEffectiveColors(overrides);
  const typo = getEffectiveTypography(overrides);
  const spacing = getEffectiveSpacing(overrides);
  const radius = getEffectiveRadius(overrides);
  const elevation = getEffectiveElevation(overrides);

  const updateColors = useCallback(
    (path: keyof Tokens["colors"], key: string, value: string) => {
      const block = (overrides.colors ?? tokens.colors)[path];
      const nextBlock = typeof block === "object" && block !== null
        ? { ...(block as Record<string, unknown>), [key]: value }
        : value;
      onChange({
        ...overrides,
        colors: { ...overrides.colors, ...tokens.colors, [path]: nextBlock } as Tokens["colors"],
      });
    },
    [overrides, onChange]
  );

  const updateTypography = useCallback(
    (path: keyof Tokens["typography"], key: string, value: string | number) => {
      const base = overrides.typography ?? tokens.typography;
      const block = (base as Record<string, unknown>)[path];
      const nextBlock = typeof block === "object" && block !== null
        ? { ...(block as Record<string, unknown>), [key]: value }
        : value;
      onChange({
        ...overrides,
        typography: {
          ...overrides.typography,
          ...tokens.typography,
          [path]: nextBlock,
        } as Tokens["typography"],
      });
    },
    [overrides, onChange]
  );

  const updateSpacing = useCallback(
    (tokenKey: keyof typeof tokens.spacing.tokens, value: number) => {
      const nextTokens = { ...(overrides.spacing?.tokens ?? tokens.spacing.tokens), [tokenKey]: value };
      onChange({
        ...overrides,
        spacing: { ...tokens.spacing, tokens: nextTokens },
      });
    },
    [overrides, onChange]
  );

  const updateRadius = useCallback(
    (value: number) => {
      const semantic = { ...(overrides.radius?.semantic ?? tokens.radius.semantic), input: value, card: value };
      onChange({
        ...overrides,
        radius: {
          ...tokens.radius,
          ...overrides.radius,
          semantic,
        },
      });
    },
    [overrides, onChange]
  );

  const elevationLevels = [0, 1, 2, 3, 4, 5, 6] as const;
  const elevationTokens = tokens.elevation.tokens as Record<number, string>;
  const cardShadowToLevel = (): number => {
    const cardShadow = elevation.semantic.card;
    const idx = elevationLevels.findIndex((l) => elevationTokens[l] === cardShadow);
    return idx >= 0 ? idx : 1;
  };
  const updateElevation = useCallback(
    (semanticKey: keyof typeof tokens.elevation.semantic, level: number) => {
      const shadow = elevationTokens[level] ?? elevationTokens[1];
      onChange({
        ...overrides,
        elevation: {
          ...tokens.elevation,
          ...overrides.elevation,
          semantic: { ...(overrides.elevation?.semantic ?? tokens.elevation.semantic), [semanticKey]: shadow },
        },
      });
    },
    [overrides, onChange]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={600}>Colors</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ flexDirection: "column", gap: 1.5, display: "flex" }}>
          {(["primary", "secondary", "success", "warning", "error"] as const).map((role) => (
            <Box key={role}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>{role}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <input
                  type="color"
                  value={(colors[role] as { main: string }).main}
                  onChange={(e) => updateColors(role, "main", e.target.value)}
                  style={{ width: 36, height: 28, border: "1px solid #ccc", borderRadius: 4, cursor: "pointer" }}
                />
                <TextField
                  size="small"
                  value={(colors[role] as { main: string }).main}
                  onChange={(e) => updateColors(role, "main", e.target.value)}
                  sx={{ flex: 1, "& input": { fontFamily: "monospace", fontSize: 12 } }}
                />
              </Stack>
            </Box>
          ))}
          <Box>
            <Typography variant="caption" color="text.secondary">Background default</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <input
                type="color"
                value={colors.background.default}
                onChange={(e) => updateColors("background", "default", e.target.value)}
                style={{ width: 36, height: 28, border: "1px solid #ccc", borderRadius: 4, cursor: "pointer" }}
              />
              <TextField
                size="small"
                value={colors.background.default}
                onChange={(e) => updateColors("background", "default", e.target.value)}
                sx={{ flex: 1, "& input": { fontFamily: "monospace", fontSize: 12 } }}
              />
            </Stack>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Text primary</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <input
                type="color"
                value={colors.text.primary}
                onChange={(e) => updateColors("text", "primary", e.target.value)}
                style={{ width: 36, height: 28, border: "1px solid #ccc", borderRadius: 4, cursor: "pointer" }}
              />
              <TextField
                size="small"
                value={colors.text.primary}
                onChange={(e) => updateColors("text", "primary", e.target.value)}
                sx={{ flex: 1, "& input": { fontFamily: "monospace", fontSize: 12 } }}
              />
            </Stack>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={600}>Spacing (px)</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ flexDirection: "column", gap: 1.5, display: "flex" }}>
          {(["xs", "sm", "md", "lg", "xl"] as const).map((key) => (
            <TextField
              key={key}
              size="small"
              label={key}
              type="number"
              value={spacing.tokens[key]}
              onChange={(e) => updateSpacing(key, Number(e.target.value) || 0)}
              InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }}
              inputProps={{ min: 0, max: 64, step: 2 }}
            />
          ))}
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={600}>Typography</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ flexDirection: "column", gap: 1.5, display: "flex" }}>
          <TextField
            size="small"
            label="Font family (primary)"
            value={typo.fontFamily.primary}
            onChange={(e) => updateTypography("fontFamily", "primary", e.target.value)}
          />
          <TextField
            size="small"
            label="Base font size"
            type="number"
            value={typo.fontSize.base}
            onChange={(e) => updateTypography("fontSize", "base", Number(e.target.value) || 14)}
            InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }}
          />
          <TextField
            size="small"
            label="Font weight medium"
            type="number"
            value={typo.fontWeight.medium}
            onChange={(e) => updateTypography("fontWeight", "medium", Number(e.target.value) || 500)}
          />
          <TextField
            size="small"
            label="Font weight bold"
            type="number"
            value={typo.fontWeight.bold}
            onChange={(e) => updateTypography("fontWeight", "bold", Number(e.target.value) || 700)}
          />
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={600}>Border radius</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ flexDirection: "column", gap: 1.5, display: "flex" }}>
          <Typography variant="caption" color="text.secondary">Component radius (input/card)</Typography>
          <Slider
            value={radius.semantic.input}
            onChange={(_, v) => updateRadius(v as number)}
            min={0}
            max={24}
            valueLabelDisplay="auto"
            marks={[{ value: 0, label: "0" }, { value: 8, label: "8" }, { value: 24, label: "24" }]}
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={() => updateRadius(4)}>4</Button>
            <Button size="small" onClick={() => updateRadius(8)}>8</Button>
            <Button size="small" onClick={() => updateRadius(12)}>12</Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={600}>Elevation (card)</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ flexDirection: "column", gap: 1.5, display: "flex" }}>
          <Typography variant="caption" color="text.secondary">Card shadow level (0–6)</Typography>
          <Slider
            value={cardShadowToLevel()}
            onChange={(_, v) => updateElevation("card", elevationLevels[v as number] ?? 1)}
            min={0}
            max={6}
            step={1}
            valueLabelDisplay="auto"
            marks={elevationLevels.map((l) => ({ value: l, label: String(l) }))}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

// --- Right panel: Live preview (must be wrapped in ThemeProvider with studio theme) ---
function LivePreview() {
  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 3 }}>
      <PageHeader
        title="Theme Preview"
        subtitle="Representative UI under the current token overrides"
      />
      <AppCard>
        <Typography variant="h6" gutterBottom>Stat-style card</Typography>
        <Typography variant="body2" color="text.secondary">Value: 1,234</Typography>
      </AppCard>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Button variant="contained">Contained</Button>
        <Button variant="outlined">Outlined</Button>
        <Button variant="text">Text</Button>
      </Stack>
      <TextField label="Sample input" placeholder="Theme-driven input" size="small" fullWidth />
      <DataTable
        columns={[
          { id: "name", label: "Name", field: "name" },
          { id: "role", label: "Role", field: "role" },
        ]}
        data={[
          { name: "Alice", role: "Admin" },
          { name: "Bob", role: "User" },
        ]}
        emptyMessage="No rows"
      />
    </Box>
  );
}

// --- Main page ---
export default function ThemeStudioPage() {
  const [overrides, setOverrides] = useState<StudioOverrides>(defaultOverrides);
  const [templates, setTemplates] = useState<ThemeTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [savePending, setSavePending] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const theme = useMemo(() => {
    const merged = mergeTokenOverrides(overrides);
    return createAppTheme(merged);
  }, [overrides]);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const { items } = await themeTemplateService.list({ page_size: 100 });
      setTemplates(items);
    } catch (e) {
      setTemplatesError(e instanceof Error ? e.message : "Failed to load templates");
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleExport = useCallback(() => {
    const config = buildExportConfig(overrides);
    downloadThemeConfig(config);
  }, [overrides]);

  const handleLoadTemplate = useCallback(
    (template: ThemeTemplate) => {
      if (template.config && typeof template.config === "object") {
        setOverrides(template.config as StudioOverrides);
        setSelectedTemplateId(template.id);
      }
    },
    []
  );

  const handleCreateTemplate = useCallback(() => {
    setNewTemplateName("");
    setNewTemplateDescription("");
    setCreateDialogOpen(true);
  }, []);

  const handleCreateSubmit = useCallback(async () => {
    const name = newTemplateName.trim();
    if (!name) return;
    setSavePending(true);
    try {
      const created = await themeTemplateService.create({
        name,
        description: newTemplateDescription.trim() || null,
        config: overrides,
      });
      setCreateDialogOpen(false);
      setSelectedTemplateId(created.id);
      fetchTemplates();
    } catch (e) {
      setTemplatesError(e instanceof Error ? e.message : "Failed to create template");
    } finally {
      setSavePending(false);
    }
  }, [newTemplateName, newTemplateDescription, overrides, fetchTemplates]);

  const handleSaveTemplate = useCallback(async () => {
    if (selectedTemplateId == null) return;
    setSavePending(true);
    try {
      await themeTemplateService.update(selectedTemplateId, { config: overrides });
      fetchTemplates();
    } catch (e) {
      setTemplatesError(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setSavePending(false);
    }
  }, [selectedTemplateId, overrides, fetchTemplates]);

  const handleDeleteTemplate = useCallback(
    async (id: number) => {
      try {
        await themeTemplateService.delete(id);
        if (selectedTemplateId === id) setSelectedTemplateId(null);
        setDeleteConfirmId(null);
        fetchTemplates();
      } catch (e) {
        setTemplatesError(e instanceof Error ? e.message : "Failed to delete template");
      }
    },
    [selectedTemplateId, fetchTemplates]
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <PageHeader
        title="Theme Studio"
        subtitle="Create and edit theme templates; export tenant theme configuration"
        actions={
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Export Theme
          </Button>
        }
      />
      <Box
        sx={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          gap: 2,
          p: 2,
        }}
      >
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            width: 360,
            flexShrink: 0,
            overflowY: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Template list */}
          <Box>
            <Typography variant="overline" color="text.secondary" gutterBottom display="block">
              Theme templates
            </Typography>
            {templatesError && (
              <Alert severity="error" sx={{ mb: 1 }} onClose={() => setTemplatesError(null)}>
                {templatesError}
              </Alert>
            )}
            {templatesLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                <List dense disablePadding sx={{ maxHeight: 160, overflow: "auto" }}>
                  {templates.map((t) => (
                    <ListItemButton
                      key={t.id}
                      selected={selectedTemplateId === t.id}
                      onClick={() => handleLoadTemplate(t)}
                      secondaryAction={
                        <IconButton
                          size="small"
                          edge="end"
                          aria-label="Delete template"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(t.id);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText primary={t.name} secondary={t.description || undefined} />
                    </ListItemButton>
                  ))}
                </List>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={handleCreateTemplate}>
                    New
                  </Button>
                  <Button
                    size="small"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveTemplate}
                    disabled={selectedTemplateId == null || savePending}
                  >
                    Save
                  </Button>
                </Stack>
              </>
            )}
          </Box>

          <Typography variant="overline" color="text.secondary" gutterBottom display="block">
            Token editor
          </Typography>
          <TokenEditor overrides={overrides} onChange={setOverrides} />
        </Paper>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
            bgcolor: "background.default",
          }}
        >
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 2 }} display="block">
              Live preview
            </Typography>
            <LivePreview />
          </ThemeProvider>
        </Paper>
      </Box>

      {/* Create template dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New theme template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description (optional)"
              value={newTemplateDescription}
              onChange={(e) => setNewTemplateDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={!newTemplateName.trim() || savePending}
            startIcon={savePending ? <CircularProgress size={16} /> : null}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmId != null} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Delete template?</DialogTitle>
        <DialogContent>
          <Typography>
            This cannot be undone. The template will be removed from the list.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteConfirmId != null && handleDeleteTemplate(deleteConfirmId)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
