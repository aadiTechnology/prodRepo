import { useEffect, useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "../primitives";
import CancelButton from "./CancelButton";
import RejectButton from "./RejectButton";

export interface ArtifactRejectDialogProps {
  open: boolean;
  title: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function ArtifactRejectDialog({
  open,
  title,
  loading = false,
  onClose,
  onConfirm,
}: ArtifactRejectDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={4}
          label="Rejection reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <CancelButton onClick={onClose} disabled={loading}>
          Cancel
        </CancelButton>
        <RejectButton
          onClick={() => onConfirm(reason.trim())}
          disabled={loading || reason.trim().length === 0}
        >
          Confirm Reject
        </RejectButton>
      </DialogActions>
    </Dialog>
  );
}
