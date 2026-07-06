import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";

type ReviewDocument = {
  id: number;
  employee_name: string;
  employee_email: string;
  employer_name?: string | null;
  document_title: string;
  original_filename?: string | null;
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
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const shouldShow = Boolean(pathname === "/hbt/member-dashboard" && ["hbt_admin", "hbt_member", "admin", "super_admin"].includes(user?.role) && token);

  const loadQueue = () => {
    if (!shouldShow) return;
    fetch(`${API_BASE_URL}/documents/review-queue`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => setDocuments(Array.isArray(data.documents) ? data.documents : []))
      .catch(() => setDocuments([]));
  };

  useEffect(() => {
    loadQueue();
  }, [shouldShow, token]);

  const updateStatus = async (documentId: number, status: string) => {
    try {
      setLoading(true);
      await fetch(`${API_BASE_URL}/documents/${documentId}/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      loadQueue();
    } finally {
      setLoading(false);
    }
  };

  if (!shouldShow || documents.length === 0) return null;

  return (
    <aside className="fixed bottom-[13rem] left-4 z-30 hidden w-[390px] rounded-[1.5rem] border border-orange-100 bg-white p-4 shadow-2xl shadow-slate-900/15 2xl:block">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Document review</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Advisor review queue</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">{documents.length} item(s) need attention</p>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-xl font-black text-orange-700 ring-1 ring-orange-100">
          {documents.length}
        </div>
      </div>
      <div className="space-y-2">
        {documents.slice(0, 3).map((doc) => (
          <div key={doc.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="line-clamp-1 font-black text-slate-950">{doc.employee_name}</h4>
                <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{doc.document_title}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(doc.status)}`}>{doc.status.replace(/_/g, " ")}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button disabled={loading} onClick={() => updateStatus(doc.id, "under_review")} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700 disabled:opacity-60">Review</button>
              <button disabled={loading} onClick={() => updateStatus(doc.id, "approved")} className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700 disabled:opacity-60">Approve</button>
              <button disabled={loading} onClick={() => updateStatus(doc.id, "needs_correction")} className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-black text-red-700 disabled:opacity-60">Fix</button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default AdvisorDocumentReviewWidget;
