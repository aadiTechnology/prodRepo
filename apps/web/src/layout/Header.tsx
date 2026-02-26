import { Box, Button, Avatar, InputBase, IconButton, Paper, Typography, Badge } from "@mui/material";
import { NotificationsOutlined, Add } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

export default function Header({ onAddUser, search, onSearch }: {
  onAddUser: () => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  const { user } = useAuth();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 3,
        py: 2,
        background: "#F9FAFB",
        borderBottom: "1px solid #E5E7EB",
        minHeight: 72,
      }}
    >
      {/* Search bar */}
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          borderRadius: 8,
          background: "#F3F4F6",
          px: 2,
          py: 1,
          width: 320,
          boxShadow: "none",
        }}
      >
        <InputBase
          placeholder="Search users..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          sx={{
            flex: 1,
            fontSize: 16,
            borderRadius: 8,
            background: "transparent",
          }}
        />
      </Paper>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton>
          <Badge color="primary" variant="dot">
            <NotificationsOutlined />
          </Badge>
        </IconButton>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{
            borderRadius: 8,
            fontWeight: 600,
            px: 3,
            boxShadow: "0 2px 8px rgba(59,130,246,0.08)",
            background: "#3B82F6",
          }}
          onClick={onAddUser}
        >
          Add User
        </Button>
        <Avatar sx={{ bgcolor: "#3B82F6", ml: 2 }}>
          {user?.full_name?.[0]?.toUpperCase() || "U"}
        </Avatar>
      </Box>
    </Box>
  );
}