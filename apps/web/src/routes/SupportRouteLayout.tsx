import { Box, Tab, Tabs } from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FaqDataProvider } from "../pages/support/context/FaqDataContext";
import { ProductUpdateProvider } from "../pages/support/context/ProductUpdateContext";

const SUPPORT_TABS = [
  { label: "FAQs", path: "/support/faqs", testId: "support-tab-faqs" },
  { label: "Contact Support", path: "/support/contact", testId: "support-tab-contact" },
  { label: "Product Updates", path: "/support/updates", testId: "support-tab-updates" },
] as const;

function hideTabsForPath(pathname: string): boolean {
  if (pathname.includes("/faqs/add")) return true;
  if (pathname.includes("/faqs/") && pathname.includes("/edit")) return true;
  if (/\/faqs\/[^/]+$/.test(pathname) && !pathname.endsWith("/faqs")) return true;
  if (pathname.includes("/updates/add")) return true;
  if (pathname.includes("/updates/") && pathname.includes("/edit")) return true;
  if (/\/updates\/[^/]+$/.test(pathname) && !pathname.endsWith("/updates")) return true;
  return false;
}

export default function SupportRouteLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const showTabs = !hideTabsForPath(location.pathname);

  const activeTab = SUPPORT_TABS.findIndex((t) => location.pathname.startsWith(t.path));
  const tabValue = activeTab >= 0 ? activeTab : 0;

  return (
    <FaqDataProvider>
      <ProductUpdateProvider>
        <Box id="support-module" data-testid="support-module">
          {showTabs && (
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tabs
                id="support-tabs"
                data-testid="support-tabs"
                value={tabValue}
                onChange={(_, idx) => navigate(SUPPORT_TABS[idx].path)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {SUPPORT_TABS.map((tab) => (
                  <Tab
                    key={tab.path}
                    id={tab.testId}
                    data-testid={tab.testId}
                    label={tab.label}
                  />
                ))}
              </Tabs>
            </Box>
          )}
          <Outlet />
        </Box>
      </ProductUpdateProvider>
    </FaqDataProvider>
  );
}
