import { useState, useCallback } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { PageHeader } from "../components/common";
import aiService, {
  type GenerateStoryAndTestsResult,
} from "../api/services/aiService";

export default function RequirementGeneratePage() {
  const [requirement, setRequirement] = useState("");
  const [result, setResult] = useState<GenerateStoryAndTestsResult | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(() => {
    if (!requirement.trim()) return;
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
  }, [requirement]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f8fafc",
        minHeight: "100%",
      }}
    >
      <PageHeader title="Generate story and tests" />

      <Paper
        sx={{
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.01)",
          border: "1px solid #e2e8f0",
          bgcolor: "white",
          p: 3,
          maxWidth: 720,
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
        <Box mt={2}>
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
                Generate
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {result && (
          <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid #e2e8f0" }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Requirement
            </Typography>
            <Typography sx={{ mb: 2 }}>{result.requirement.description}</Typography>

            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              User Stories
            </Typography>
            <Box component="ol" sx={{ pl: 2.5, m: 0, mb: 2 }}>
              {result.user_stories.map((us, idx) => (
                <Box component="li" key={us.id} sx={{ mb: 1.5 }}>
                  <Typography fontWeight={600}>{us.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Story: {us.story}
                  </Typography>
                  {us.acceptance_criteria && us.acceptance_criteria.length > 0 && (
                    <Typography component="span" variant="body2" sx={{ display: "block", mt: 0.5 }}>
                      Acceptance Criteria
                      <Box component="ul" sx={{ pl: 2, m: 0, mt: 0.25 }}>
                        {us.acceptance_criteria.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </Box>
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>

            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Test Cases
            </Typography>
            <Box sx={{ mb: 1 }}>
              {result.test_cases.map((tc) => (
                <Box
                  key={tc.id}
                  sx={{
                    mb: 2,
                    p: 1.5,
                    bgcolor: "#f8fafc",
                    borderRadius: 1,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography fontWeight={600} gutterBottom>
                    Scenario: {tc.scenario}
                  </Typography>
                  {tc.steps && tc.steps.length > 0 && (
                    <>
                      <Typography variant="body2" fontWeight={600}>
                        Steps
                      </Typography>
                      <Box component="ol" sx={{ pl: 2.5, m: 0 }}>
                        {tc.steps.map((step, i) => (
                          <li key={i}>
                            <Typography variant="body2">{step}</Typography>
                          </li>
                        ))}
                      </Box>
                    </>
                  )}
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                    Expected Result
                  </Typography>
                  <Typography variant="body2">{tc.expected_result}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
