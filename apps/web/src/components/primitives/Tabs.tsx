/**
 * Tabs — UI Primitive
 * Single point of access to MUI Tabs/Tab. Theme-driven.
 */

import { Tabs as MuiTabs, TabsProps as MuiTabsProps } from "@mui/material";
import { Tab as MuiTab, TabProps as MuiTabProps } from "@mui/material";

export type TabsProps = MuiTabsProps;
export type TabProps = MuiTabProps;

export function Tabs({ sx, ...props }: TabsProps) {
  return <MuiTabs sx={sx} {...props} />;
}

export function Tab(props: MuiTabProps) {
  return <MuiTab {...props} />;
}
