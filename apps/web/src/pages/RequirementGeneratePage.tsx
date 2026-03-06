import { useState, useCallback } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { PageHeader } from "../components/common";
import aiService, {
  type GenerateStoryAndTestsResult,
} from "../api/services/aiService";

function normalizeToList(value: string[] | string | null): string[] {
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

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: "100%",
        width: "100%",
        backgroundColor: "#f8fafc",
      }}
    >
      <PageHeader title="Generate story and tests" />

      <Paper
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.01)",
          border: "1px solid #e2e8f0",
          bgcolor: "white",
          p: 3,
          width: "100%",
        }}
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
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              mt: 3,
              pt: 3,
              borderTop: "1px solid #e2e8f0",
            }}
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
                  sx={{
                    p: 2,
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    bgcolor: "#fafbfc",
                  }}
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
            <TableContainer component={Paper} variant="outlined" sx={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                    <TableCell sx={{ fontWeight: 700 }}>Scenario</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Pre-Requisite</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Test Data</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Steps</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Expected Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.test_cases.map((tc) => {
                    const preReqList = normalizeToList(tc.pre_requisite);
                    const testDataList = normalizeToList(tc.test_data);
                    const hasTestData = testDataList.length > 0;
                    return (
                      <TableRow key={tc.id} hover>
                        <TableCell sx={{ verticalAlign: "top" }}>
                          <Typography variant="body2">{tc.scenario}</Typography>
                        </TableCell>
                        <TableCell sx={{ verticalAlign: "top" }}>
                          {preReqList.length > 0 ? (
                            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                              {preReqList.map((p, i) => (
                                <li key={i}>
                                  <Typography variant="body2">{p}</Typography>
                                </li>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: "top" }}>
                          {hasTestData ? (
                            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                              {testDataList.map((d, i) => (
                                <li key={i}>
                                  <Typography variant="body2">{d}</Typography>
                                </li>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: "top" }}>
                          {tc.steps && tc.steps.length > 0 ? (
                            <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                              {tc.steps.map((step, i) => (
                                <li key={i}>
                                  <Typography variant="body2">{step}</Typography>
                                </li>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: "top" }}>
                          <Typography variant="body2">{tc.expected_result}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
