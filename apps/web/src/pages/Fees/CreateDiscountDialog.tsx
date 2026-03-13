import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    CircularProgress,
    Alert
} from "@mui/material";
import feeDiscountService from "../../api/services/feeDiscountService";
import { FeeDiscount } from "../../types/feeDiscount";
type FeeDiscountCreate = import("../../types/feeDiscount").FeeDiscountCreate;

interface CreateDiscountDialogProps {
    open: boolean;
    onClose: (refresh?: boolean) => void;
    editDiscount?: FeeDiscount | null;
    onSuccess?: () => void;
}

const defaultForm: FeeDiscountCreate = {
    discount_name: "",
    discount_type: "PERCENTAGE",
    discount_value: 0,
    fee_category: "",
    status: true,
};

const CreateDiscountDialog: React.FC<CreateDiscountDialogProps> = ({ open, onClose, editDiscount, onSuccess }) => {
    const [form, setForm] = useState<FeeDiscountCreate>(defaultForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editDiscount) {
            setForm({
                discount_name: editDiscount.discount_name,
                discount_type: editDiscount.discount_type,
                discount_value: editDiscount.discount_value,
                fee_category: editDiscount.fee_category,
                status: editDiscount.status,
                ...(editDiscount.applicable_class !== undefined ? { applicable_class: editDiscount.applicable_class } : {}),
                ...(editDiscount.description !== undefined ? { description: editDiscount.description } : {}),
            });
        } else {
            setForm(defaultForm);
        }
    }, [editDiscount, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setForm((prev: FeeDiscountCreate) => {
            let updated: any = { ...prev };
            updated[name] = type === "checkbox" ? checked : value;
            // Remove optional fields if empty string
            if ((name === "applicable_class" || name === "description") && updated[name] === "") {
                delete updated[name];
            }
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (editDiscount) {
                await feeDiscountService.update(editDiscount.id, form);
            } else {
                await feeDiscountService.create(form);
            }
            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err?.message || "Failed to save discount.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose()} maxWidth="sm" fullWidth>
            <DialogTitle>{editDiscount ? "Edit Discount" : "Create Discount"}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        label="Discount Name"
                        name="discount_name"
                        value={form.discount_name}
                        onChange={handleChange}
                        fullWidth
                        required
                        margin="normal"
                    />
                    <TextField
                        select
                        label="Type"
                        name="discount_type"
                        value={form.discount_type}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                    >
                        <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                        <MenuItem value="FIXED">Fixed Amount</MenuItem>
                    </TextField>
                    <TextField
                        label="Value"
                        name="discount_value"
                        type="number"
                        value={form.discount_value}
                        onChange={handleChange}
                        fullWidth
                        required
                        margin="normal"
                        inputProps={{ min: 0 }}
                    />
                    <TextField
                        label="Fee Category"
                        name="fee_category"
                        value={form.fee_category}
                        onChange={handleChange}
                        fullWidth
                        required
                        margin="normal"
                    />
                    <TextField
                        label="Applicable Class"
                        name="applicable_class"
                        value={form.applicable_class}
                        onChange={handleChange}
                        fullWidth
                        required
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => onClose()} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" color="primary" disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : (editDiscount ? "Update" : "Create")}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default CreateDiscountDialog;
