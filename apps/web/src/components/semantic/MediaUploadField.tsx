import { useRef } from "react";
import { Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import {
  Box,
  IconButton,
  Typography,
} from "../primitives";

export type MediaUploadSlotItem = {
  id: string;
  previewUrl: string;
};

export interface MediaUploadFieldProps {
  label?: string;
  items: MediaUploadSlotItem[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveItem: (id: string) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  size?: "small" | "medium" | "large";
  tooltipChoose?: string;
  tooltipAdd?: string;
  tooltip?: string;
}

/**
 * A premium file upload component for forms. Hides the URL input functionality.
 */
export default function MediaUploadField({
  label = "Upload File",
  items,
  onAddFiles,
  onRemoveItem,
  accept = "image/*",
  multiple = true,
  maxFiles,
  size = "large",
  tooltipChoose = "Choose files",
  tooltipAdd = "Add more files",
  tooltip,
}: MediaUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const atCapacity = maxFiles !== undefined && items.length >= maxFiles;
  const canReplaceSingle = maxFiles === 1 && items.length === 1;
  const canOpenPicker = !atCapacity || canReplaceSingle;
  const inputMultiple = Boolean(multiple && maxFiles !== 1);

  const containerSize = size === "small" ? 64 : size === "medium" ? 110 : 130;
  const iconSize = size === "small" ? 28 : size === "medium" ? 44 : 56;

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

  return (
    <Box>
      {size !== "small" && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
          {label}
        </Typography>
      )}
      <Box 
        sx={{ 
          p: size === "small" ? 1 : 2.5, 
          border: '1px dashed', 
          borderColor: 'divider', 
          borderRadius: size === "small" ? 2 : 3,
          bgcolor: 'background.paper',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }
        }}
      >
        <input
          ref={fileInputRef}
          accept={accept}
          type="file"
          hidden
          multiple={inputMultiple}
          onChange={handleFileChange}
        />
        
        {items.length > 0 ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, justifyContent: "center", mb: canOpenPicker ? 2.5 : 0 }}>
            {items.map((item) => (
              <Box 
                key={item.id} 
                sx={{ 
                  position: "relative", 
                  width: containerSize, 
                  height: containerSize,
                  boxShadow: 3,
                  borderRadius: 3,
                  border: '2px solid',
                  borderColor: 'background.paper',
                  overflow: 'visible'
                }}
              >
                <Box
                  component="img"
                  src={item.previewUrl}
                  alt="Preview"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 2.5,
                    display: 'block'
                  }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                  sx={{ 
                    position: "absolute", 
                    top: -10, 
                    right: -10,
                    bgcolor: 'error.main',
                    color: 'white',
                    boxShadow: 2,
                    zIndex: 1,
                    '&:hover': { 
                      bgcolor: 'error.dark',
                      transform: 'scale(1.1)'
                    }
                  }}
                  aria-label="Remove"
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        ) : null}

        {canOpenPicker ? (
          <Tooltip title={tooltip || (items.length === 0 ? tooltipChoose : tooltipAdd)} arrow placement="top">
            <Box 
              onClick={openFilePicker}
              sx={{ 
                cursor: 'pointer',
                display: "flex", 
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
                py: items.length > 0 ? 1 : 4,
                '&:hover .upload-icon': {
                  transform: 'scale(1.1)',
                  opacity: 1
                }
              }}
            >
              <CloudUploadIcon 
                className="upload-icon"
                sx={{ 
                  fontSize: iconSize, 
                  color: 'primary.main', 
                  opacity: 0.6,
                  transition: 'all 0.3s ease'
                }} 
              />
              {size !== "small" && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {items.length === 0 ? tooltipChoose : tooltipAdd}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SVG, PNG, JPG or GIF (max. 800x800px)
                  </Typography>
                </Box>
              )}
            </Box>
          </Tooltip>
        ) : null}
      </Box>
    </Box>
  );
}
