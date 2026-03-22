import { useRef } from "react";
import { Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import {
  Box,
  IconButton,
  InputAdornment,
  Tabs,
  Tab,
  Typography,
} from "../primitives";
import TextFieldInput from "./TextFieldInput";

export type MediaUploadSlotItem = {
  id: string;
  previewUrl: string;
};

export interface MediaUploadUrlFieldProps {
  label?: string;
  tabIndex: number;
  onTabChange: (index: number) => void;
  urlValue: string;
  urlFieldName: string;
  onUrlChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  urlError?: string;
  urlInputLabel?: string;
  urlPlaceholder?: string;
  items: MediaUploadSlotItem[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveItem: (id: string) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  tooltipChoose?: string;
  tooltipAdd?: string;
}

export default function MediaUploadUrlField({
  label = "Media",
  tabIndex,
  onTabChange,
  urlValue,
  urlFieldName,
  onUrlChange,
  urlError,
  urlInputLabel = "URL",
  urlPlaceholder = "https://",
  items,
  onAddFiles,
  onRemoveItem,
  accept = "image/*",
  multiple = true,
  maxFiles,
  tooltipChoose = "Choose files",
  tooltipAdd = "Add more files",
}: MediaUploadUrlFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const atCapacity = maxFiles !== undefined && items.length >= maxFiles;
  const canReplaceSingle = maxFiles === 1 && items.length === 1;
  const canOpenPicker = !atCapacity || canReplaceSingle;
  const inputMultiple = Boolean(multiple && maxFiles !== 1);

  const openFilePicker = () => {
    if (!canOpenPicker) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files?.length) {
      onAddFiles(files);
    }
    e.target.value = "";
  };

  const showUrlPreview = Boolean(urlValue && !urlValue.startsWith("data:"));

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Tabs value={tabIndex} onChange={(_, v) => onTabChange(v)}>
        <Tab label="Upload" />
        <Tab label="URL" />
      </Tabs>
      {tabIndex === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 2, mt: 2 }}>
          <input
            ref={fileInputRef}
            accept={accept}
            type="file"
            hidden
            multiple={inputMultiple}
            onChange={handleFileChange}
          />
          {items.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "center" }}>
              {items.map((item) => (
                <Box key={item.id} sx={{ position: "relative", width: 100, height: 100 }}>
                  <Box
                    component="img"
                    src={item.previewUrl}
                    alt=""
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      borderRadius: 1,
                      bgcolor: "action.hover",
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => onRemoveItem(item.id)}
                    sx={{ position: "absolute", top: -6, right: -6 }}
                    aria-label="Remove"
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : null}
          {canOpenPicker ? (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Tooltip title={items.length === 0 ? tooltipChoose : tooltipAdd}>
                <IconButton
                  type="button"
                  color="primary"
                  onClick={openFilePicker}
                  aria-label={items.length === 0 ? tooltipChoose : tooltipAdd}
                  size="large"
                >
                  <CloudUploadIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ) : null}
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextFieldInput
            label={urlInputLabel}
            placeholder={urlPlaceholder}
            name={urlFieldName}
            value={urlValue}
            onChange={onUrlChange}
            error={Boolean(urlError)}
            helperText={urlError}
            htmlInput={{ minLength: 0 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon color="primary" fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {showUrlPreview ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
              <Box
                component="img"
                src={urlValue}
                alt=""
                sx={{ height: 40, maxWidth: 150, objectFit: "contain" }}
              />
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
