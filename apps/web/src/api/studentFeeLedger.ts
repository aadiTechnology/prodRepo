import axios from "axios";

const API_BASE = "/api/fee-ledger";

export const fetchStudents = async (search = "", tenantId: number) => {
  try {
    const params: any = { tenant_id: tenantId };
    if (search) params.search = search;
    const res = await axios.get(`${API_BASE}/students`, { params });
    return res.data.students || [];
  } catch (err) {
    return [];
  }
};

export const fetchFeeLedger = async (studentId: number, academicYear: string, tenantId: number) => {
  if (!studentId) return null;
  try {
    const res = await axios.get(`${API_BASE}/${studentId}`, {
      params: { academic_year: academicYear, tenant_id: tenantId },
    });
    return res.data;
  } catch (err) {
    return null;
  }
};

export const downloadFeeLedger = async (studentId: number, tenantId: number) => {
  try {
    const res = await axios.get(`${API_BASE}/download/${studentId}`, {
      params: { tenant_id: tenantId },
      responseType: "blob",
    });
    // Check content-type before saving
    const contentType = res.headers["content-type"];
    if (!contentType || !contentType.includes("application/pdf")) {
      alert("Download failed: Not a valid PDF. Please check student selection or contact support.");
      return null;
    }
    const blob = res.data;
    // Try to get filename from Content-Disposition header
    let filename = "fee_ledger.pdf";
    const disposition = res.headers["content-disposition"];
    if (disposition) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match) filename = match[1];
    }
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.type = "application/pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    alert("Download failed: Network or server error.");
    return null;
  }
};
