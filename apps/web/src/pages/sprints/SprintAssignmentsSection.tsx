import { useMemo } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Autocomplete } from "../../components/primitives";
import type { OptionItem, SprintFeatureAssignmentWrite } from "../../types/sprint";

export type SprintAssignmentsSectionProps = {
  disabled: boolean;
  features: OptionItem[];
  users: OptionItem[];
  pagesByFeatureId: Record<number, OptionItem[]>;
  value: SprintFeatureAssignmentWrite[];
  onChange: (next: SprintFeatureAssignmentWrite[]) => void;
  onRequestPages: (featureId: number) => void;
};

function _dedupeNumbers(v: number[]) {
  return Array.from(new Set(v)).filter((x) => Number.isFinite(x));
}

export default function SprintAssignmentsSection(props: SprintAssignmentsSectionProps) {
  const { disabled, features, users, pagesByFeatureId, value, onChange, onRequestPages } = props;

  const selectedFeatureOptions = useMemo(() => {
    const ids = new Set(value.map((x) => x.feature_id));
    return features.filter((f) => ids.has(f.id));
  }, [features, value]);

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Assignments
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select features, then pages under each feature, then allocate users per page.
      </Typography>

      <Box sx={{ mb: 2, maxWidth: 720 }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Features
        </Typography>
        <Autocomplete<OptionItem, true, false, false>
          multiple
          disableCloseOnSelect
          options={features}
          value={selectedFeatureOptions}
          disabled={disabled}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_e, selected) => {
            const nextFeatureIds = selected.map((x) => x.id);
            const next = nextFeatureIds.map((fid) => {
              const existing = value.find((v) => v.feature_id === fid);
              return existing ?? { feature_id: fid, pages: [] };
            });
            onChange(next);
            // request pages for newly added features
            for (const fid of nextFeatureIds) onRequestPages(fid);
          }}
          renderInput={(params) => <TextField {...params} placeholder="Select features" size="small" />}
        />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {value.map((f) => {
          const featureLabel = features.find((x) => x.id === f.feature_id)?.label ?? `Feature ${f.feature_id}`;
          const pageOptions = pagesByFeatureId[f.feature_id] ?? [];
          const selectedPages = pageOptions.filter((p) => f.pages.some((pp) => pp.page_id === p.id));

          return (
            <Accordion
              key={f.feature_id}
              defaultExpanded
              sx={{ borderRadius: 2, "&:before": { display: "none" } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 600 }}>{featureLabel}</Typography>
                  <Chip size="small" label={`${f.pages.length} page(s)`} />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ maxWidth: 720 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      Pages
                    </Typography>
                    <Autocomplete<OptionItem, true, false, false>
                      multiple
                      disableCloseOnSelect
                      options={pageOptions}
                      value={selectedPages}
                      disabled={disabled}
                      getOptionLabel={(o) => o.label}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      onOpen={() => onRequestPages(f.feature_id)}
                      onChange={(_e, selected) => {
                        const nextPages = selected.map((p) => {
                          const existing = f.pages.find((x) => x.page_id === p.id);
                          return existing ?? { page_id: p.id, user_ids: [] };
                        });
                        onChange(
                          value.map((x) => (x.feature_id === f.feature_id ? { ...x, pages: nextPages } : x))
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={pageOptions.length ? "Select pages" : "Load pages"}
                          size="small"
                        />
                      )}
                    />
                  </Box>

                  {f.pages.map((p) => {
                    const pageLabel =
                      pageOptions.find((x) => x.id === p.page_id)?.label ?? `Page ${p.page_id}`;
                    const selectedUsers = users.filter((u) => p.user_ids.includes(u.id));

                    return (
                      <Box key={p.page_id} sx={{ p: 1.5, borderRadius: 2, border: "1px solid #eee" }}>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>{pageLabel}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Assigned users
                        </Typography>
                        <Autocomplete<OptionItem, true, false, false>
                          multiple
                          disableCloseOnSelect
                          options={users}
                          value={selectedUsers}
                          disabled={disabled}
                          getOptionLabel={(o) => o.label}
                          isOptionEqualToValue={(a, b) => a.id === b.id}
                          onChange={(_e, selected) => {
                            const nextIds = _dedupeNumbers(selected.map((x) => x.id));
                            onChange(
                              value.map((fx) => {
                                if (fx.feature_id !== f.feature_id) return fx;
                                return {
                                  ...fx,
                                  pages: fx.pages.map((px) =>
                                    px.page_id === p.page_id ? { ...px, user_ids: nextIds } : px
                                  ),
                                };
                              })
                            );
                          }}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Select users" size="small" />
                          )}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
}

