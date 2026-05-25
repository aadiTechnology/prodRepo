import { useMemo } from "react";
import { useRBAC } from "../context/RBACContext";
import { useAuth } from "../context/AuthContext";
import {
  isInvoiceReadOnlyAudience,
  isParentInvoiceUser,
  isStudentInvoiceUser,
} from "../utils/invoiceAudience";

export function useInvoicePermissions() {
  const { hasPermission, roles } = useRBAC();
  const { user } = useAuth();

  const canView = hasPermission("FEE_MGMT:view");
  const canCreate = hasPermission("FEE_MGMT:create");
  const canEdit = hasPermission("FEE_MGMT:edit");
  const canDelete = hasPermission("FEE_MGMT:delete");
  const readOnlyAudience = useMemo(
    () => isInvoiceReadOnlyAudience(user?.role, roles),
    [user?.role, roles],
  );
  const isStudentUser = useMemo(
    () => isStudentInvoiceUser(user?.role, roles),
    [user?.role, roles],
  );
  const isParentUser = useMemo(
    () => isParentInvoiceUser(user?.role, roles),
    [user?.role, roles],
  );

  const canCreateInvoices = canCreate && !readOnlyAudience;
  const canEditInvoices = canEdit && !readOnlyAudience;
  const canDeleteInvoices = canDelete && !readOnlyAudience;

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    readOnlyAudience,
    isStudentUser,
    isParentUser,
    showStudentColumn: !isStudentUser,
    canPay: canView && readOnlyAudience,
    canManage: canCreateInvoices || canEditInvoices || canDeleteInvoices,
    canCreateInvoices,
    canEditInvoices,
    canDeleteInvoices,
  };
}
