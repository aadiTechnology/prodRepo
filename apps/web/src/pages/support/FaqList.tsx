import { Navigate } from "react-router-dom";

/** Legacy FAQ list route — Support M1 lands on My Queries. */
export default function FaqList() {
  return <Navigate to="/support/contact" replace />;
}
