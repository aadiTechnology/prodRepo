import { Box, Button, Avatar, InputBase, IconButton, Paper, Typography, Badge, alpha, useTheme } from "@mui/material";
import { NotificationsOutlined, Add, Search as SearchIcon } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

export default function Header({ onAddUser, search, onSearch }: {
  onAddUser: () => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  const { user } = useAuth();
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 2, md: 4 },
        py: 3,
        backgroundColor: "transparent",
        mb: 2,
      }}
    >
      <Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            color: "text.primary",
            letterSpacing: "-1.5px",
            lineHeight: 1.1
          }}
        >
          Customer Base
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500, mt: 0.5, opacity: 0.8 }}>
          Overview and management of all registered tenant systems.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        {/* Search bar */}
        <Paper
          elevation={0}
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            borderRadius: "14px",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(0,0,0,0.06)",
            px: 2,
            py: 0.75,
            width: 320,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:focus-within": {
              width: 380,
              borderColor: "primary.main",
              boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`,
              background: "#fff"
            }
          }}
        >
          <SearchIcon sx={{ color: "text.secondary", mr: 1, fontSize: 20 }} />
          <InputBase
            placeholder="Search tenants, admins..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            sx={{
              flex: 1,
              fontSize: "0.875rem",
              fontWeight: 500,
              "& .MuiInputBase-input::placeholder": {
                color: "text.secondary",
                opacity: 0.7
              }
            }}
          />
        </Paper>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            sx={{
              bgcolor: "white",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: "12px",
              "&:hover": { bgcolor: "rgba(0,0,0,0.02)" }
            }}
          >
            <Badge color="primary" variant="dot">
              <NotificationsOutlined sx={{ fontSize: 22, color: "text.secondary" }} />
            </Badge>
          </IconButton>

          <Button
            variant="contained"
            disableElevation
            startIcon={<Add />}
            sx={{
              borderRadius: "12px",
              fontWeight: 800,
              textTransform: "none",
              px: 3.5,
              py: 1.25,
              fontSize: "0.875rem",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)",
                boxShadow: "0 6px 20px rgba(99, 102, 241, 0.4)",
                transform: "translateY(-1px)"
              },
              transition: "all 0.2s"
            }}
            onClick={onAddUser}
          >
            Create New Tenant
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
