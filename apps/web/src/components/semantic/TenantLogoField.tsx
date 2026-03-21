import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Tabs,
  Tab,
  Typography,
} from "../primitives";
import TextFieldInput from "./TextFieldInput";

export interface TenantLogoFieldProps {
  logoUrl: string;
  tabIndex: number;
  onTabChange: (index: number) => void;
  onLogoUrlChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearLogo: () => void;
  logoUrlError?: string;
}

export default function TenantLogoField({
  logoUrl,
  tabIndex,
  onTabChange,
  onLogoUrlChange,
  onFileInputChange,
  onClearLogo,
  logoUrlError,
}: TenantLogoFieldProps) {
  const displayUrl = logoUrl.startsWith("data:") ? "" : logoUrl;
  const isDataLogo = Boolean(logoUrl && logoUrl.startsWith("data:"));

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Logo
      </Typography>
      <Tabs value={tabIndex} onChange={(_, v) => onTabChange(v)}>
        <Tab label="Upload" />
        <Tab label="URL" />
      </Tabs>
      {tabIndex === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 2 }}>
          {isDataLogo ? (
            <Box sx={{ position: "relative" }}>
              <Box
                component="img"
                src={logoUrl}
                alt="Logo"
                sx={{ height: 60, maxWidth: 200, objectFit: "contain", borderRadius: 1 }}
              />
              <IconButton size="small" onClick={onClearLogo} sx={{ position: "absolute", top: -8, right: -8 }}>
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ) : (
            <CloudUploadIcon color="primary" sx={{ fontSize: 40, opacity: 0.5 }} />
          )}
          <input accept="image/*" id="tenant-logo-file-input" type="file" hidden onChange={onFileInputChange} />
          <label htmlFor="tenant-logo-file-input">
            <Button component="span" variant="outlined" size="small">
              {isDataLogo ? "Replace file" : "Choose logo"}
            </Button>
          </label>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextFieldInput
            label="Logo URL"
            placeholder="https://example.com/logo.png"
            name="logo_url"
            value={displayUrl}
            onChange={onLogoUrlChange}
            error={Boolean(logoUrlError)}
            helperText={logoUrlError}
            htmlInput={{ minLength: 0 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon color="primary" fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {logoUrl && !logoUrl.startsWith("data:") ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
              <Box
                component="img"
                src={logoUrl}
                alt="Logo preview"
                sx={{ height: 40, maxWidth: 150, objectFit: "contain" }}
              />
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
