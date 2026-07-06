import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";

type ChecklistItem = {
  id: number;
  title: string;
  description?: string | null;
  is_required: number;
  status: string;
  document?: { id: number; status: string; original_filename?: string | null; file_size_bytes?: number | null } | null;
};

type ChecklistPayload = {
  checklist: ChecklistItem[];
  progress: { percent: number; required_uploaded: number; required_count: number; approved_count: number };
};

const statusTone = (status: string) => {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "needs_correction" || status === "rejected") return "bg-red-100 text-red-700";
  if (status === "uploaded" || status === "under_review") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
};

const formatSize = (bytes?: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function EmployeeDocumentChecklistWidget() {
  const { pathname } = useLocation();
  const [payload, setPayload] = useState<ChecklistPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<number, File | null>>({});
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const shouldShow = Boolean(pathname === "/employee-portal" && user?.role === "employee" && token);

  const loadChecklist = () => {
    if (!shouldShow) return;
    fetch(`${API_BASE_URL}/documents/checklist`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => setPayload(data.status === "success" ? data : null))
      .catch(() => setPayload(null));
  };

  useEffect(() => { loadChecklist(); }, [shouldShow, token]);

  const uploadDocument = async (item: ChecklistItem) => {
    const selectedFile = selectedFiles[item.id];
    if (!selectedFile) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("template_id", String(item.id));
      formData.append("document_title", item.title);
      formData.append("file", selectedFile);
      await fetch(`${API_BASE_URL}/documents/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      setSelectedFiles((current) => ({ ...current, [item.id]: null }));
      loadChecklist();
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (documentId: number, filename?: string | null) => {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `document-${documentId}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (!shouldShow || !payload) return null;
  const nextItems = payload.checklist.slice(0, 4);

  return (
    <aside className="fixed bottom-[13rem] right-4 z-30 hidden w-[430px] rounded-[1.5rem] border border-sky-100 bg-white p-4 shadow-2xl shadow-slate-900/15 2xl:block">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">Secure document upload</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Mortgage preparation</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">{payload.progress.required_uploaded}/{payload.progress.required_count} required submitted</p>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-xl font-black text-sky-700 ring-1 ring-sky-100">{payload.progress.percent}%</div>
      </div>
      <div className="mb-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-sky-600" style={{ width: `${Math.min(payload.progress.percent, 100)}%` }} /></div>
      <div className="space-y-2">
        {nextItems.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><h4 className="line-clamp-1 font-black text-slate-950">{item.title}</h4><p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{item.document?.original_filename || (item.is_required ? "Required" : "Optional")} {formatSize(item.document?.file_size_bytes)}</p></div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(item.status)}`}>{item.status.replace(/_/g, " ")}</span>
            </div>
            {item.document ? (
              <button onClick={() => downloadDocument(item.document!.id, item.document!.original_filename)} className="mt-2 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-black text-sky-700 ring-1 ring-sky-100 hover:bg-sky-50">Download</button>
            ) : (
              <div className="mt-2 grid gap-2">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(event) => setSelectedFiles((current) => ({ ...current, [item.id]: event.target.files?.[0] || null }))} className="text-xs font-semibold text-slate-600" />
                <button disabled={loading || !selectedFiles[item.id]} onClick={() => uploadDocument(item)} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white hover:bg-sky-700 disabled:opacity-60">Upload secure file</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default EmployeeDocumentChecklistWidget;
