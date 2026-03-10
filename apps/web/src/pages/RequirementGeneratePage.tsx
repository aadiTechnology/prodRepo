import { useState, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { ListPageLayout, DataTable } from "../components/reusable";
import { PageHeader } from "../components/layout";
import aiService, {
  type GenerateStoryAndTestsResult,
} from "../api/services/aiService";

function normalizeToList(value: string[] | string | null | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export default function RequirementGeneratePage() {
  const [requirement, setRequirement] = useState("");
  const [result, setResult] = useState<GenerateStoryAndTestsResult | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(() => {
    if (!requirement.trim() || loading) return;
    setError(null);
    setLoading(true);
    aiService
      .generateStoryAndTests(requirement.trim())
      .then((data) => {
        setResult(data);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail ?? err?.message ?? "Request failed");
        setResult(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [requirement, loading]);

  const handleRetry = useCallback(() => {
    setError(null);
    handleGenerate();
  }, [handleGenerate]);

  const testCaseColumns = useMemo(
    () => [
      {
        id: "scenario",
        label: "Scenario",
        render: (row: (typeof result extends null ? never : GenerateStoryAndTestsResult["test_cases"][0]) & Record<string, unknown>) => (
          <Typography variant="body2">{(row as { scenario?: string }).scenario}</Typography>
        ),
      },
      {
        id: "pre_requisite",
        label: "Pre-Requisite",
        render: (row: (typeof result extends null ? never : GenerateStoryAndTestsResult["test_cases"][0]) & Record<string, unknown>) => {
          const preReqList = normalizeToList((row as { pre_requisite?: string[] | string | null }).pre_requisite);
          return preReqList.length > 0 ? (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {preReqList.map((p, i) => (
                <li key={i}><Typography variant="body2">{p}</Typography></li>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">—</Typography>
          );
        },
      },
      {
        id: "test_data",
        label: "Test Data",
        render: (row: (typeof result extends null ? never : GenerateStoryAndTestsResult["test_cases"][0]) & Record<string, unknown>) => {
          const testDataList = normalizeToList((row as { test_data?: string[] | string | null }).test_data);
          return testDataList.length > 0 ? (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {testDataList.map((d, i) => (
                <li key={i}><Typography variant="body2">{d}</Typography></li>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">—</Typography>
          );
        },
      },
      {
        id: "steps",
        label: "Steps",
        render: (row: (typeof result extends null ? never : GenerateStoryAndTestsResult["test_cases"][0]) & Record<string, unknown>) => {
          const steps = (row as { steps?: string[] }).steps;
          return steps && steps.length > 0 ? (
            <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
              {steps.map((step, i) => (
                <li key={i}><Typography variant="body2">{step}</Typography></li>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">—</Typography>
          );
        },
      },
      {
        id: "expected_result",
        label: "Expected Result",
        render: (row: (typeof result extends null ? never : GenerateStoryAndTestsResult["test_cases"][0]) & Record<string, unknown>) => (
          <Typography variant="body2">{(row as { expected_result?: string }).expected_result}</Typography>
        ),
      },
    ],
    []
  );

  return (
    <ListPageLayout
      header={<PageHeader title="Generate story and tests" />}
      contentPaddingSize="normal"
    >
      <Paper
        sx={(theme) => ({
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: 1.5,
          boxShadow: theme.shadows[1],
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          p: 3,
          width: "100%",
        })}
      >
        <Typography fontWeight={600} sx={{ mb: 1 }}>
          Enter Requirement
        </Typography>
        <TextField
          placeholder="e.g. User must securely logout"
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          multiline
          rows={4}
          fullWidth
          margin="normal"
          variant="outlined"
          disabled={loading}
        />
        <Box mt={2} display="flex" alignItems="center" gap={1}>
          <Button
            type="button"
            variant="contained"
            color="primary"
            onClick={handleGenerate}
            disabled={loading || !requirement.trim()}
          >
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Generating…
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            onClose={() => setError(null)}
            action={
              <Button color="inherit" size="small" onClick={handleRetry}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {result && (
          <Box
            sx={(theme) => ({
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              mt: 3,
              pt: 3,
              borderTop: `1px solid ${theme.palette.divider}`,
            })}
          >
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Requirement
            </Typography>
            <Typography sx={{ mb: 3 }}>
              {result.requirement.description}
            </Typography>

            <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mb: 1.5 }}>
              User Stories
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
              {result.user_stories.map((us) => (
                <Paper
                  key={us.id}
                  variant="outlined"
                  sx={(theme) => ({
                    p: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: theme.palette.grey[50],
                  })}
                >
                  <Typography fontWeight={700} sx={{ mb: 1 }}>
                    {us.title}
                  </Typography>
                  {us.prerequisite && us.prerequisite.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
                        Prerequisite
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                        {us.prerequisite.map((p, i) => (
                          <li key={i}>
                            <Typography variant="body2">{p}</Typography>
                          </li>
                        ))}
                      </Box>
                    </Box>
                  )}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
                      Story
                    </Typography>
                    <Typography variant="body2">{us.story}</Typography>
                  </Box>
                  {us.acceptance_criteria && us.acceptance_criteria.length > 0 && (
                    <Box>
                      <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
                        Acceptance Criteria
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                        {us.acceptance_criteria.map((c, i) => (
                          <li key={i}>
                            <Typography variant="body2">{c}</Typography>
                          </li>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>

            <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mb: 1.5 }}>
              Test Cases
            </Typography>
            <DataTable
              columns={testCaseColumns}
              data={result.test_cases as (GenerateStoryAndTestsResult["test_cases"][0] & Record<string, unknown>)[]}
              emptyMessage="No test cases."
              stickyHeader={false}
              size="small"
            />
          </Box>
        )}
      </Paper>
    </ListPageLayout>
  );
}
