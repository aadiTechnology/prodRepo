/**
 * Tenant configuration: how many days before the due date an outstanding
 * installment starts appearing in the Due Fee list (past-due installments are always listed).
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  AlertTitle,
  Box,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";

import feesApi, { type FeeDueDisplayConfig } from "../../api/services/feesApi";
import { PageHeader } from "../../components/layout";
import { FormHeaderIconAction } from "../../components/primitives";
import { ListPageLayout } from "../../components/reusable";
import { CancelButton, SaveButton } from "../../components/semantic";

const DEFAULT_DAYS_BEFORE_DUE = 7;

const DAYS_OPTIONS = Array.from({ length: 31 }, (_, i) => i);

function daysLabel(days: number): string {
  if (days === 0) return "On the due date";
  return days === 1 ? "1 day before due date" : `${days} days before due date`;
}

export default function FeeDueDisplayConfigPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [daysBeforeDue, setDaysBeforeDue] = useState<number>(DEFAULT_DAYS_BEFORE_DUE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config: FeeDueDisplayConfig = await feesApi.getDueDisplayConfig();
      setDaysBeforeDue(config.days_before_due);
    } catch {
      enqueueSnackbar("Failed to load due fee configuration", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await feesApi.updateDueDisplayConfig({
        display_enabled: true,
        days_before_due: daysBeforeDue,
      });
      setDaysBeforeDue(saved.days_before_due);
      enqueueSnackbar("Due fee configuration saved", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to save due fee configuration", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const exampleDue = dayjs().add(15, "day");
  const exampleVisibleFrom = exampleDue.subtract(daysBeforeDue, "day");
  const notes = [
    "Choose when an unpaid installment starts appearing in the Due Fee list.",
    "Installments past their due date are always shown.",
    `Example: an installment due on ${exampleDue.format("DD MMM YYYY")} will appear in the Due Fee list from ${exampleVisibleFrom.format("DD MMM YYYY")}.`,
  ];

  return (
    <ListPageLayout
      data-testid="page-fee-due-display-config"
      scrollableFormContent
      contentPaddingSize="normal"
      header={
        <PageHeader
          homePath="/"
          links={[
            { title: "Fee Due List", path: "/fees/due-list-v2" },
            { title: "Due Fee Configuration", path: "/fees/due-display-config" },
          ]}
          actions={
            <FormHeaderIconAction
              variant="save"
              tooltipTitle="Save"
              onClick={() => void save()}
              disabled={loading}
              loading={saving}
            />
          }
        />
      }
    >
      <Alert
        severity="info"
        sx={{ mb: 4, "& .MuiAlert-message": { width: "100%" } }}
        data-testid="due-display-notes"
      >
        <AlertTitle sx={{ fontWeight: 700 }}>Notes</AlertTitle>
        <Stack divider={<Divider flexItem />} spacing={1}>
          {notes.map((note, index) => (
            <Typography key={index} variant="body2">
              {index + 1}. {note}
            </Typography>
          ))}
        </Stack>
      </Alert>

     <Box sx={{ xs: 4, sm: 4 ,lg:4 ,gap: 2}}>
        <TextField
          select
          size="small"
          label="Show in Due Fee list from"
          value={daysBeforeDue}
          disabled={loading || saving}
          onChange={(e) => setDaysBeforeDue(Number(e.target.value))}
          inputProps={{ "data-testid": "input-days-before-due" }}
          sx={{ xs: 4, sm: 4 ,lg:4 }}
        >
          {DAYS_OPTIONS.map((d) => (
            <MenuItem key={d} value={d}>
              {daysLabel(d)}
            </MenuItem>
          ))}
        </TextField>
        </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: "center",
          mt: 4,
        }}
      >
         <CancelButton
          type="button"
          onClick={() => navigate("/fees/due-list-v2")}
          disabled={saving}
          data-testid="btn-cancel"
        >
          Cancel
        </CancelButton>
        <SaveButton
          type="button"
          onClick={() => void save()}
          disabled={loading}
          loading={saving}
          data-testid="btn-save"
        >
          Save
        </SaveButton>
      </Box>
    </ListPageLayout>
  );
}
