import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Paper,
    Typography,
    Alert,
    CircularProgress,
    IconButton,
    Tooltip,
    Switch,
    Divider,
    Stack,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { Button, TextField, Select, MenuItem } from "../../components/primitives";
import { SaveButton, CancelButton } from "../../components/semantic";
import {
    Home as HomeIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    ErrorOutline as ErrorIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Assignment as AssignmentIcon,
    CalendarMonth as CalendarIcon,
    Class as ClassIcon,
    Description as DescriptionIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/layout";
import feeService from "../../api/services/feeService";
import { ListPageLayout, FormSectionLabel, FieldLabel, DataTable } from "../../components/reusable";
import { FeeStructure, FeeCategory, AcademicYear, ClassEntity, FeeInstallment } from "../../types/fee";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// ─── Validation Schema ──────────────────────────────────────────────────────────
const feeStructureSchema = z.object({
    academic_year_id: z.union([z.number(), z.string().length(0)]).pipe(z.coerce.number()).refine(val => val > 0, "Please select an academic year"),
    class_id: z.union([z.number(), z.string().length(0)]).pipe(z.coerce.number()).refine(val => val > 0, "Please select class"),
    fee_category_id: z.string().min(1, "Please select fee category"),
    total_amount: z.union([z.number(), z.string()]).pipe(z.coerce.number())
        .refine(val => val > 0, "Amount is required"),
    installment_type: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
    num_installments: z.coerce.number()
        .min(1, "At least 1 installment is required")
        .max(12, "Maximum 12 installments allowed per year"),
    description: z.string().optional(),
    is_active: z.boolean().default(true),
});

type FeeStructureFormValues = z.infer<typeof feeStructureSchema>;

// ─── TextField sx (theme-driven) ───────────────────────────────────────────────
const buildFieldSx = (hasError: boolean) => (theme: Theme) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: 1.5,
        bgcolor: theme.palette.background.paper,
        fontSize: "1rem", // Increased from 0.95rem
        fontWeight: 500,
        "& fieldset": { 
            borderColor: hasError ? theme.palette.error.main : theme.palette.divider, 
            borderWidth: hasError ? "2px" : "1.2px",
            transition: "all 0.2s ease-in-out"
        },
        "&:hover fieldset": { borderColor: hasError ? theme.palette.error.main : theme.palette.grey[400] },
        "&.Mui-focused": {
            "& fieldset": { borderColor: hasError ? theme.palette.error.main : theme.palette.primary.main, borderWidth: "2px" },
        },
        "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: theme.palette.grey[500] },
    },
    "& .MuiInputLabel-root": { 
        fontSize: "1rem", // Increased from 0.9rem
        color: theme.palette.text.secondary,
        fontWeight: 500,
        "&.Mui-focused": { 
            color: hasError ? theme.palette.error.main : theme.palette.primary.main,
            fontWeight: 600
        },
        "&.MuiInputLabel-shrink": {
            fontSize: "0.9rem", // Larger floating label
            transform: "translate(14px, -10px) scale(1)" // Calibration for larger size
        }
    },
    "& .MuiFormHelperText-root": { fontSize: "0.8rem", mt: 0.5, ml: 0 },
});

// ─── FeeStructureForm ──────────────────────────────────────────────────────────
const FeeStructureForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEditMode);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Lookups
    const [categories, setCategories] = useState<FeeCategory[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [classes, setClasses] = useState<ClassEntity[]>([]);
    const [installments, setInstallments] = useState<FeeInstallment[]>([]);

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<FeeStructureFormValues>({
        resolver: zodResolver(feeStructureSchema),
        defaultValues: {
            academic_year_id: "" as any,
            class_id: "" as any,
            fee_category_id: "",
            total_amount: "" as any,
            installment_type: "QUARTERLY",
            num_installments: 4,
            description: "",
            is_active: true,
        },
    });

    const watchedTotalAmount = watch("total_amount");
    const watchedNumInstallments = watch("num_installments");
    const watchedInstallmentType = watch("installment_type");

    // Fetch Lookups
    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [cats, years, cls] = await Promise.all([
                    feeService.getFeeCategories(),
                    feeService.getAcademicYears(),
                    feeService.getClasses(),
                ]);
                setCategories(cats);
                setAcademicYears(years);
                setClasses(cls);
            } catch (err) {
                console.error("Failed to load lookups", err);
            }
        };
        fetchLookups();
    }, []);

    // Fetch existing data for Edit Mode
    const fetchStructure = useCallback(async () => {
        if (!id) return;
        try {
            setFetchLoading(true);
            const structuresRes = await feeService.getFeeStructures(0, 10, ""); // Need a getById in service?
            // Since there's no getById, we might need to find it or the service needs an update.
            // For now, let's assume we might need to fetch it differently or the service has it.
            // Checking feeService.ts again... it has updateFeeStructure(id, data) but no getFeeStructure(id).
            // Actually, FeeStructureSetup.tsx uses `selectedStructure` passed from list.
            // In a real app with routes, we need a getById.
            // Let's check if the service can be extended or if I should just use the list.
            const response = await feeService.getFeeStructures(0, 1000); 
            const found = response.items.find(s => s.id === Number(id));
            
            if (found) {
                reset({
                    academic_year_id: found.academic_year_id,
                    class_id: found.class_id,
                    fee_category_id: found.fee_category_id,
                    total_amount: found.total_amount,
                    installment_type: found.installment_type as any,
                    num_installments: found.num_installments,
                    description: found.description || "",
                    is_active: found.is_active,
                });
                if (found.installments) setInstallments(found.installments);
            } else {
                setError("Fee structure not found.");
            }
        } catch (err: any) {
            setError(err?.message || "Failed to load fee structure.");
        } finally {
            setFetchLoading(false);
        }
    }, [id, reset]);

    useEffect(() => { if (isEditMode) fetchStructure(); }, [fetchStructure, isEditMode]);

    // Generate Installment Schedule
    useEffect(() => {
        const count = parseInt(watchedNumInstallments.toString()) || 0;
        const total = parseFloat(watchedTotalAmount.toString()) || 0;
        
        if (count > 0 && total > 0) {
            const perInstallment = Math.floor((total / count) * 100) / 100;
            const remainder = Math.round((total - (perInstallment * count)) * 100) / 100;
            
            const newInstallments = Array.from({ length: count }, (_, i) => ({
                installment_number: i + 1,
                amount: i === count - 1 ? Math.round((perInstallment + remainder) * 100) / 100 : perInstallment,
                due_date: new Date(new Date().setMonth(new Date().getMonth() + i)).toISOString().split('T')[0],
                late_fee_applicable: true,
                late_fee_amount: 100
            }));
            setInstallments(newInstallments);
        } else {
            setInstallments([]);
        }
    }, [watchedNumInstallments, watchedTotalAmount, watchedInstallmentType]);

    const onFormSubmit = async (data: FeeStructureFormValues) => {
        setLoading(true);
        setError(null);
        try {
            // 1. Validate installment total
            const instSum = installments.reduce((acc, inst) => acc + (Number(inst.amount) || 0), 0);
            if (Math.abs(instSum - data.total_amount) > 0.01) {
                setError("Installment total must equal fee amount");
                setLoading(false);
                return;
            }

            // 2. Validate installments individually
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            let lastDate = new Date(0);
            for (const inst of installments) {
                if (Number(inst.amount) <= 0) {
                    setError("Installment amount must be greater than zero");
                    setLoading(false);
                    return;
                }
                
                const instDate = new Date(inst.due_date);
                if (instDate < now) {
                    setError("Due date cannot be in the past");
                    setLoading(false);
                    return;
                }
                
                if (instDate < lastDate) {
                    setError("Installment dates must be sequential");
                    setLoading(false);
                    return;
                }
                lastDate = instDate;

                if (Number(inst.late_fee_amount) < 0) {
                    setError("Late fee cannot be negative");
                    setLoading(false);
                    return;
                }
            }

            const payload = {
                ...data,
                installments: installments.map(({ id, ...rest }) => rest),
            };

            if (isEditMode && id) {
                await feeService.updateFeeStructure(Number(id), payload as any);
                setSuccess("Fee structure updated successfully!");
            } else {
                await feeService.createFeeStructure(payload as any);
                setSuccess("Fee structure created successfully!");
            }
            setTimeout(() => navigate("/fees/setup"), 1000);
        } catch (err: any) {
            let msg = err?.message || "Failed to save fee structure.";
            const isConflict = err?.response?.status === 409 || msg.toLowerCase().includes("exists") || msg.toLowerCase().includes("already");
            const isInUse = msg.toLowerCase().includes("paid") || msg.toLowerCase().includes("collect") || msg.toLowerCase().includes("process");
            
            if (isConflict) {
                msg = "Fee structure already exists for this class and category";
            } else if (isInUse) {
                if (isEditMode) {
                    msg = "Total amount cannot be less than the amount already collected (or structure is in use)";
                } else {
                    msg = "Cannot modify structure: Payments have already been processed";
                }
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
            <CircularProgress sx={{ color: "#1a1a2e" }} />
        </Box>
    );

    return (
        <ListPageLayout
            pageBackground={true}
            contentPaddingSize="none"
            header={
                <>
                    <PageHeader
                        onBack={() => navigate("/fees/setup")}
                        backIcon={<HomeIcon sx={{ color: "white", fontSize: 24 }} />}
                        title={
                            <>
                                <Box component="span" onClick={() => navigate("/fees/setup")}
                                    sx={(theme) => ({ color: theme.palette.text.secondary, cursor: "pointer", "&:hover": { color: theme.palette.text.primary } })}>
                                    Fee Setup
                                </Box>
                                <Box component="span" sx={{ color: "#cbd5e1", mx: 1.5 }}>/</Box>
                                {isEditMode ? "Edit Structure" : "New Structure"}
                            </>
                        }
                        actions={
                            <>
                                <Tooltip title="Cancel">
                                    <IconButton onClick={() => navigate("/fees/setup")}
                                        sx={(theme) => ({ color: theme.palette.error.main, backgroundColor: theme.palette.error.light, borderRadius: 1.2, width: 40, height: 40, "&:hover": { backgroundColor: theme.palette.error.light } })}>
                                        <CancelIcon sx={{ fontSize: 22 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={isEditMode ? "Update Structure" : "Save Structure"}>
                                    <span>
                                        <IconButton onClick={handleSubmit(onFormSubmit)} disabled={loading}
                                            sx={(theme) => ({
                                                backgroundColor: theme.palette.success.main, color: theme.palette.success.contrastText, borderRadius: 1.2, width: 40, height: 40,
                                                "&:hover": { backgroundColor: theme.palette.success.dark }, "&.Mui-disabled": { backgroundColor: theme.palette.grey[400], color: "white" }
                                            })}>
                                            {loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon sx={{ fontSize: 20 }} />}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </>
                        }
                    />
                    {error && <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 1, borderRadius: "8px", py: 0.3 }} onClose={() => setError(null)}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 1, borderRadius: "8px", py: 0.3 }}>{success}</Alert>}
                </>
            }
        >
            <Box sx={{ flex: 1, overflowY: "auto", pb: 2, pr: 0.5 }}>
                <Paper elevation={0} sx={(theme) => ({ borderRadius: 1.25, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper, overflow: "hidden" })}>

                    {/* Dark header */}
                    <Box sx={{ py: 1, px: { xs: 2, md: 3 }, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#1a1a2e" }}>
                        <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {isEditMode ? "Edit Fee Structure Details" : "New Fee Structure Details"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                            <Box component="span" sx={(theme) => ({ color: theme.palette.error.light })}>*</Box> required fields
                        </Typography>
                    </Box>

                    {/* ── Two-column body ── */}
                    <Box sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                        gap: 0,
                    }}>
                        {/* ── LEFT COLUMN ── */}
                        <Box sx={(theme) => ({ borderRight: { md: `1px solid ${theme.palette.divider}` } })}>

                            {/* Configuration */}
                            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 3, pb: 2 }}>
                                <FormSectionLabel icon={<AssignmentIcon sx={{ fontSize: 16 }} />} title="Configuration" />
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                                    <Box>
                                        <Controller
                                            name="academic_year_id"
                                            control={control}
                                            render={({ field }) => (
                                                <Select {...field} label="Academic Year" required fullWidth 
                                                    error={Boolean(errors.academic_year_id)}
                                                    helperText={errors.academic_year_id?.message}
                                                    sx={buildFieldSx(Boolean(errors.academic_year_id))}>
                                                    {academicYears.map(ay => <MenuItem key={ay.id} value={ay.id}>{ay.name}</MenuItem>)}
                                                </Select>
                                            )}
                                        />
                                    </Box>
                                    <Box>
                                        <Controller
                                            name="class_id"
                                            control={control}
                                            render={({ field }) => (
                                                <Select {...field} label="Class" required fullWidth 
                                                    error={Boolean(errors.class_id)}
                                                    helperText={errors.class_id?.message}
                                                    sx={buildFieldSx(Boolean(errors.class_id))}>
                                                    {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                                </Select>
                                            )}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: "1 / 3" }}>
                                        <Controller
                                            name="fee_category_id"
                                            control={control}
                                            render={({ field }) => (
                                                <Select {...field} label="Fee Category" required fullWidth 
                                                    error={Boolean(errors.fee_category_id)}
                                                    helperText={errors.fee_category_id?.message}
                                                    sx={buildFieldSx(Boolean(errors.fee_category_id))}>
                                                    {categories.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
                                                </Select>
                                            )}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: "1 / 3" }}>
                                        <Controller
                                            name="description"
                                            control={control}
                                            render={({ field }) => (
                                                <TextField {...field} label="Description" fullWidth multiline rows={2} sx={buildFieldSx(false)} />
                                            )}
                                        />
                                    </Box>
                                    <Box sx={(theme) => ({
                                        gridColumn: "1 / 3",
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        px: 1.5, py: 0.8, borderRadius: 1, border: `1.2px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50],
                                    })}>
                                        <Box>
                                            <Typography sx={(theme) => ({ fontSize: "0.82rem", fontWeight: 700, color: theme.palette.text.primary })}>Structure Active</Typography>
                                            <Typography sx={(theme) => ({ fontSize: "0.7rem", color: theme.palette.text.secondary })}>Control if this fee is currently being charged</Typography>
                                        </Box>
                                        <Controller
                                            name="is_active"
                                            control={control}
                                            render={({ field: { value, onChange } }) => (
                                                <Switch checked={value} onChange={onChange} size="small"
                                                    sx={(theme) => ({ "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.success.main }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: theme.palette.success.main } })} />
                                            )}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </Box>

                        {/* ── RIGHT COLUMN ── */}
                        <Box>
                            {/* Financial Details */}
                            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 3, pb: 2 }}>
                                <FormSectionLabel icon={<AssignmentIcon sx={{ fontSize: 16 }} />} title="Financial Details" />
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                                    <Box>
                                        <Controller
                                            name="total_amount"
                                            control={control}
                                            render={({ field }) => (
                                                <TextField {...field} label="Total Amount" required type="number" fullWidth
                                                    error={Boolean(errors.total_amount)} helperText={errors.total_amount?.message}
                                                    sx={buildFieldSx(Boolean(errors.total_amount))} />
                                            )}
                                        />
                                    </Box>
                                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                                        <Box>
                                            <Controller
                                                name="installment_type"
                                                control={control}
                                                render={({ field: { value, onChange } }) => (
                                                    <Select
                                                        label="Installment Type"
                                                        value={value}
                                                        onChange={(e) => {
                                                            const type = e.target.value as string;
                                                            let count = 1;
                                                            if (type === 'MONTHLY') count = 12;
                                                            if (type === 'QUARTERLY') count = 4;
                                                            onChange(type);
                                                            setValue("num_installments", count);
                                                        }}
                                                        fullWidth sx={buildFieldSx(false)}
                                                    >
                                                        <MenuItem value="MONTHLY">Monthly</MenuItem>
                                                        <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                                                        <MenuItem value="YEARLY">Yearly/One-time</MenuItem>
                                                    </Select>
                                                )}
                                            />
                                        </Box>
                                        <Box>
                                            <Controller
                                                name="num_installments"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField {...field} label="No. of Installments" type="number" fullWidth
                                                        error={Boolean(errors.num_installments)} helperText={errors.num_installments?.message}
                                                        sx={buildFieldSx(Boolean(errors.num_installments))} />
                                                )}
                                            />
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>

                            <Divider sx={(theme) => ({ borderColor: theme.palette.divider })} />

                            {/* Schedule Preview */}
                            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 1.5, pb: 2 }}>
                                <FormSectionLabel icon={<CalendarIcon sx={{ fontSize: 15 }} />} title="Installment Schedule Preview" />
                                {installments.length > 0 ? (
                                    <Box sx={{ mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.25, overflow: 'hidden' }}>
                                        <DataTable<any>
                                            columns={[
                                                { id: 'num', label: '#' , render: (row: any) => row.installment_number },
                                                { id: 'amt', label: 'Amount', render: (row: any) => `₹${Number(row.amount).toLocaleString()}` },
                                                { id: 'date', label: 'Due Date', render: (row: any) => row.due_date }
                                            ]}
                                            data={installments}
                                        />
                                    </Box>
                                ) : (
                                    <Box sx={{ p: 2, textAlign: "center", bgcolor: "grey.50", borderRadius: 1, border: "1px dashed", borderColor: "grey.300" }}>
                                        <Typography variant="body2" color="textSecondary">
                                            Enter amount and installments to see preview
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={(theme) => ({
                        px: { xs: 2, md: 3 }, py: 1.2,
                        borderTop: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50],
                        display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0,
                    })}>
                        <CancelButton
                            onClick={() => navigate("/fees/setup")}
                            sx={{
                                color: "#ef4444",
                                backgroundColor: "transparent",
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                                px: 4,
                                borderRadius: 0,
                                minWidth: 120,
                                boxShadow: "none",
                                border: "none",
                                textTransform: "none",
                                "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
                            }}
                        >
                            Cancel
                        </CancelButton>
                        <SaveButton
                            onClick={handleSubmit(onFormSubmit)}
                            disabled={loading}
                            loading={loading}
                            sx={(theme) => ({
                                color: theme.palette.success.main,
                                backgroundColor: "transparent",
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                                px: 4,
                                borderRadius: 0,
                                minWidth: 120,
                                boxShadow: "none",
                                border: "none",
                                textTransform: "none",
                                "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
                                "&.Mui-disabled": { color: theme.palette.text.secondary },
                            })}
                        >
                            {loading ? "Saving…" : isEditMode ? "Update" : "Save"}
                        </SaveButton>
                    </Box>
                </Paper>
            </Box>
        </ListPageLayout>
    );
};

export default FeeStructureForm;
