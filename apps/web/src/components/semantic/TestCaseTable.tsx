/**
 * TestCaseTable — Semantic component
 * Renders related test cases for a selected user story.
 */

import { Box, Button, Typography } from "../primitives";
import { DataTable } from "../reusable";
import ReviewStatusBadge from "./ReviewStatusBadge";
import ApproveButton from "./ApproveButton";
import RejectButton from "./RejectButton";
import type { TestCaseItem } from "../../api/services/aiService";

export interface TestCaseTableProps {
  testCases: TestCaseItem[];
  onApprove?: (testCaseId: number) => void;
  onReject?: (testCaseId: number) => void;
  onEdit?: (testCaseId: number) => void;
  onRegenerate?: (testCaseId: number) => void;
  approvingId?: number | null;
  rejectingId?: number | null;
  savingId?: number | null;
  regeneratingId?: number | null;
}

function renderList(
  value: string[] | string | null | undefined,
  ordered = false
) {
  if (value == null) {
    return <Typography variant="body2" color="text.secondary">-</Typography>;
  }

  const items = Array.isArray(value) ? value : [value];
  if (items.length === 0) {
    return <Typography variant="body2" color="text.secondary">-</Typography>;
  }

  return (
    <Box component={ordered ? "ol" : "ul"} sx={{ m: 0, pl: 2.5 }}>
      {items.map((item, index) => (
        <li key={index}>
          <Typography variant="body2">{item}</Typography>
        </li>
      ))}
    </Box>
  );
}

export default function TestCaseTable({
  testCases,
  onApprove,
  onReject,
  onEdit,
  onRegenerate,
  approvingId = null,
  rejectingId = null,
  savingId = null,
  regeneratingId = null,
}: TestCaseTableProps) {
  return (
    <DataTable<TestCaseItem>
      columns={[
        {
          id: "test_case_id",
          label: "Test Case ID",
          render: (testCase) => (
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
              {testCase.test_case_id}
            </Typography>
          ),
        },
        {
          id: "scenario",
          label: "Scenario",
          render: (testCase) => testCase.scenario,
        },
        {
          id: "status",
          label: "Status",
          render: (testCase) => (
            <ReviewStatusBadge status={testCase.review_status ?? "draft"} />
          ),
        },
        {
          id: "rejection_reason",
          label: "Rejection Reason",
          render: (testCase) =>
            testCase.review_status === "rejected" && testCase.rejection_reason ? (
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                    bgcolor: "rgba(211, 47, 47, 0.08)",
                  color: "error.dark",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {testCase.rejection_reason}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                -
              </Typography>
            ),
        },
        {
          id: "steps",
          label: "Steps",
          render: (testCase) => renderList(testCase.steps, true),
        },
        {
          id: "expected_result",
          label: "Expected Result",
          render: (testCase) => testCase.expected_result,
        },
      ]}
      data={testCases}
      getRowKey={(testCase) => testCase.id}
      renderRowActions={
        onApprove != null && onReject != null
          ? (testCase) =>
              testCase.review_status === "draft" ? (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <ApproveButton
                    size="small"
                    disabled={
                      approvingId === testCase.id || rejectingId === testCase.id
                    }
                    onClick={() => onApprove(testCase.id)}
                  />
                  <RejectButton
                    size="small"
                    disabled={
                      approvingId === testCase.id || rejectingId === testCase.id
                    }
                    onClick={() => onReject(testCase.id)}
                  />
                </Box>
              ) : testCase.review_status === "rejected" ? (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    disabled={savingId === testCase.id || regeneratingId === testCase.id}
                    onClick={() => onEdit?.(testCase.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    disabled={savingId === testCase.id || regeneratingId === testCase.id}
                    onClick={() => onRegenerate?.(testCase.id)}
                  >
                    Regenerate
                  </Button>
                </Box>
              ) : null
          : undefined
      }
      emptyMessage="No test cases available."
      stickyHeader={false}
    />
  );
}
