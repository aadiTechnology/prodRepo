/**
 * TestCaseList — Semantic component
 * Displays a list of test cases with scenario, steps, expected result.
 * Reuses DataTable; supports approve/reject per row.
 */

import { Box, Typography } from "../primitives";
import { DataTable } from "../reusable";
import ReviewStatusBadge, { type ReviewStatus } from "./ReviewStatusBadge";
import ApproveButton from "./ApproveButton";
import RejectButton from "./RejectButton";
import type { TestCaseItem } from "../../api/services/aiService";

export interface TestCaseListProps {
  testCases: TestCaseItem[];
  /** Whether current user can approve/reject */
  canReview?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  /** When a request is in progress for an id */
  approvingId?: number | null;
  rejectingId?: number | null;
}

export default function TestCaseList({
  testCases,
  canReview = false,
  onApprove,
  onReject,
  approvingId = null,
  rejectingId = null,
}: TestCaseListProps) {
  const columns = [
    {
      id: "review_status",
      label: "Status",
      render: (row: TestCaseItem) => (
        <ReviewStatusBadge status={(row.review_status ?? "draft") as ReviewStatus} />
      ),
    },
    {
      id: "scenario",
      label: "Scenario",
      render: (row: TestCaseItem) => (
        <Typography variant="body2">{row.scenario}</Typography>
      ),
    },
    {
      id: "steps",
      label: "Steps",
      render: (row: TestCaseItem) => {
        const steps = row.steps;
        return steps && steps.length > 0 ? (
          <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
            {steps.map((step, i) => (
              <li key={i}>
                <Typography variant="body2">{step}</Typography>
              </li>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      },
    },
    {
      id: "expected_result",
      label: "Expected Result",
      render: (row: TestCaseItem) => (
        <Typography variant="body2">{row.expected_result}</Typography>
      ),
    },
    ...(canReview && onApprove && onReject
      ? [
          {
            id: "actions",
            label: "Actions",
            render: (row: TestCaseItem) => {
              const isDraft = (row.review_status ?? "draft") === "draft";
              if (!isDraft) return null;
              return (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <ApproveButton
                    size="small"
                    onClick={() => onApprove(row.id)}
                    disabled={approvingId === row.id || rejectingId === row.id}
                  />
                  <RejectButton
                    size="small"
                    onClick={() => onReject(row.id)}
                    disabled={approvingId === row.id || rejectingId === row.id}
                  />
                </Box>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={testCases}
      emptyMessage="No test cases."
      stickyHeader={false}
      size="small"
    />
  );
}
