import { Badge, Tooltip } from "@mui/material";
import { NotificationsOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { IconButton } from "../../../components/primitives";
import { useNotifications } from "../NotificationContext";

/**
 * Header bell: shows unread count and navigates to the Notification Screen.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  return (
    <Tooltip title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "Notifications"}>
      <IconButton
        color="inherit"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        onClick={() => navigate("/notifications")}
        data-testid="notification-bell"
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.7)",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "12px",
          width: { xs: 40, sm: 44 },
          height: { xs: 40, sm: 44 },
          "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" },
        }}
      >
        <Badge
          badgeContent={unreadCount > 0 ? unreadCount : 0}
          color="error"
          max={99}
          invisible={unreadCount === 0}
          data-testid="notification-unread-badge"
        >
          <NotificationsOutlined sx={{ fontSize: 22, color: "text.secondary" }} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
