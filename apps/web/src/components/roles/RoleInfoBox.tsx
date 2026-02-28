import React from "react";
import { Box, Typography, Paper, Divider, Chip, Button } from "@mui/material";

interface RoleInfoBoxProps {
  role: any;
  onClose?: () => void;
}

export default function RoleInfoBox({ role, onClose }: RoleInfoBoxProps) {
  if (!role) return null;
  return (
    <Paper
      elevation={6}
      sx={{
        p: 3,
        borderRadius: 3,
        minWidth: 320,
        maxWidth: 420,
        bgcolor: "#f5f5f5",
        position: "fixed",
        top: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1300,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "auto",
      }}
    >
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Role Details
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Role Name
          </Typography>
          <Typography sx={{ mb: 1 }}>{role.name}</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Description
          </Typography>
          <Typography sx={{ mb: 1 }}>{role.description || "No description provided."}</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Scope
          </Typography>
          <Typography sx={{ mb: 1 }}>
            {(() => {
              const val = (role.scope || role.scope_type || "").toString().toLowerCase();
              if (val === "platform") return "Platform";
              if (val === "tenant") return "Tenant";
              return role.scope || role.scope_type || "Unknown";
            })()}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Status
          </Typography>
          <Chip
            label={role.status === "ACTIVE" ? "Active" : "Inactive"}
            color={role.status === "ACTIVE" ? "success" : "default"}
            sx={{ mb: 1 }}
          />
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
            Permissions Assigned
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
            {role.permissions && role.permissions.length > 0 ? (
              role.permissions.map((perm: any) => (
                <Chip key={perm.id} label={perm.name} size="small" color="secondary" />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No permissions assigned.
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
        <Button variant="outlined" color="primary" onClick={onClose}>
          Close
        </Button>
      </Box>
    </Paper>
  );
}

