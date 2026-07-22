import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { readStoredToken, readStoredUser } from "../utils/auth";

type ReviewDocument = {
  id: number;
  employee_name: string;
  employee_email: string;
  employer_name?: string | null;
  document_title: string;
  original_filename?: string | null;
  file_size_bytes?: number | null;
  status: string;
  uploaded_at: string;
};

const statusTone = (status: string) => {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "needs_correction" || status === "rejected") return "bg-red-100 text-red-700";
  if (status === "under_review") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
};

function AdvisorDocumentReviewWidget() {
  const { pathname } = useLocation();
  const [documents, setDocuments] = useState<ReviewDocument[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const token = readStoredToken();
  const user = readStoredUser();
  const shouldShow = Boolean(
    pathname === "/hbt/member-dashboard" &&
      ["hbt_admin", "hbt_member", "admin", "super_admin"].includes(String(user?.role || "")) &&
      token,
  );

  const loadQueue = useCallback(async () => {
    if (!shouldShow || !token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/documents/review-queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to load review queue");
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch {
      setDocuments([]);
      setNotice("Document review queue is temporarily unavailable.");
    }
  }, [shouldShow, token]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const updateStatus = async (documentId: number, status: string) => {
    if (!token) return;

    try {
      setSavingId(documentId);
      setNotice("");
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Status update failed");
      setNotice("Document status updated.");
      await loadQueue();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Document status update failed.");
    } finally {
      setSavingId(null);
    }
  };

  const downloadDocument = async (doc: ReviewDocument) => {
    if (!token) return;

    try {
      setNotice("");
      const response = await fetch(`${API_BASE_URL}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Document download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.original_filename || `document-${doc.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Document download failed.");
    }
  };

  if (!shouldShow || documents.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6">
      <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-lg shadow-slate-200/60">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Secure document review</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Advisor review queue</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">{documents.length} item(s) need attention</p>
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-2xl font-black text-orange-700 ring-1 ring-orange-100">{documents.length}</div>
        </div>

        {notice && <p className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">{notice}</p>}

        <div className="grid gap-3 xl:grid-cols-2">
          {documents.slice(0, 8).map((doc) => (
            <article key={doc.id} className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="line-clamp-1 font-black text-slate-950">{doc.employee_name}</h4>
                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{doc.document_title} · {doc.original_filename || "file"}</p>
                  {doc.employer_name && <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">{doc.employer_name}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(doc.status)}`}>{String(doc.status || "uploaded").replace(/_/g, " ")}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => downloadDocument(doc)} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Download</button>
                <button type="button" disabled={savingId === doc.id} onClick={() => updateStatus(doc.id, "under_review")} className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-700 disabled:opacity-60">Review</button>
                <button type="button" disabled={savingId === doc.id} onClick={() => updateStatus(doc.id, "approved")} className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-60">Approve</button>
                <button type="button" disabled={savingId === doc.id} onClick={() => updateStatus(doc.id, "needs_correction")} className="rounded-full bg-red-100 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-60">Request fix</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AdvisorDocumentReviewWidget;
