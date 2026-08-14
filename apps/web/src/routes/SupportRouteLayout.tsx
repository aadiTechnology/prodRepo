import { Box } from "@mui/material";
import { Navigate, Outlet } from "react-router-dom";
import { FaqDataProvider } from "../pages/support/context/FaqDataContext";
import { ProductUpdateProvider } from "../pages/support/context/ProductUpdateContext";
import { useSupportPermissions } from "../hooks/useSupportPermissions";

export function SupportIndexRedirect() {
  const perms = useSupportPermissions();
  return <Navigate to={perms.canViewMyQueries ? "contact" : "updates"} replace />;
}

export default function SupportRouteLayout() {
  return (
    <FaqDataProvider>
      <ProductUpdateProvider>
        <Box id="support-module" data-testid="support-module">
          <Outlet />
        </Box>
      </ProductUpdateProvider>
    </FaqDataProvider>
  );
}
