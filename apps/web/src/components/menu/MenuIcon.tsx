/**
 * MenuIcon Component
 * Resolves icon name to MUI icon component
 */

import { SvgIconComponent } from "@mui/icons-material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  MenuBook as MenuBookIcon,
  Business as BusinessIcon,
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  AccountCircle as AccountCircleIcon,
} from "@mui/icons-material";

const iconMap: Record<string, SvgIconComponent> = {
  dashboard: DashboardIcon,
  home: HomeIcon,
  users: PeopleIcon,
  people: PeopleIcon,
  person: PersonIcon,
  settings: SettingsIcon,
  admin: AdminIcon,
  menu: MenuBookIcon,
  business: BusinessIcon,
  inventory: InventoryIcon,
  assessment: AssessmentIcon,
  account: AccountCircleIcon,
};

interface MenuIconProps {
  iconName: string | null;
  fontSize?: "small" | "medium" | "large";
}

export default function MenuIcon({ iconName, fontSize = "medium" }: MenuIconProps) {
  if (!iconName) {
    return null;
  }

  const IconComponent = iconMap[iconName.toLowerCase()];
  
  if (!IconComponent) {
    // Fallback to a default icon if icon name not found
    return <MenuBookIcon fontSize={fontSize} />;
  }

  return <IconComponent fontSize={fontSize} />;
}
