import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { readStoredToken, readStoredUser } from "../utils/auth";

type ChecklistItem = {
  id: number;
  title: string;
  description?: string | null;
  is_required: number;
  status: string;
  document?: {
    id: number;
    status: string;
    original_filename?: string | null;
    file_size_bytes?: number | null;
  } | null;
};

type ChecklistPayload = {
  checklist: ChecklistItem[];
  progress: {
    percent: number;
    required_uploaded: number;
    required_count: number;
    approved_count: number;
  };
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

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
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<number, File | null>>({});
  const [notice, setNotice] = useState("");
  const token = readStoredToken();
  const user = readStoredUser();
  const shouldShow = Boolean(pathname === "/employee-portal" && user?.role === "employee" && token);

  const loadChecklist = useCallback(async () => {
    if (!shouldShow || !token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/documents/checklist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to load document checklist");
      setPayload(data.status === "success" ? data : null);
    } catch {
      setPayload(null);
      setNotice("Document checklist is temporarily unavailable.");
    }
  }, [shouldShow, token]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const selectFile = (itemId: number, file: File | null) => {
    setNotice("");
    if (file && file.size > MAX_FILE_BYTES) {
      setSelectedFiles((current) => ({ ...current, [itemId]: null }));
      setNotice("File is too large. Maximum upload size is 10 MB.");
      return;
    }
    setSelectedFiles((current) => ({ ...current, [itemId]: file }));
  };

  const uploadDocument = async (item: ChecklistItem) => {
    const selectedFile = selectedFiles[item.id];
    if (!selectedFile || !token) return;

    try {
      setUploadingId(item.id);
      setNotice("");
      const formData = new FormData();
      formData.append("template_id", String(item.id));
      formData.append("document_title", item.title);
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Upload failed");

      setSelectedFiles((current) => ({ ...current, [item.id]: null }));
      setNotice(`${item.title} uploaded successfully.`);
      await loadChecklist();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Document upload failed.");
    } finally {
      setUploadingId(null);
    }
  };

  const downloadDocument = async (documentId: number, filename?: string | null) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `document-${documentId}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      setNotice("Document download failed.");
    }
  };

  if (!shouldShow || !payload) return null;

  const checklist = Array.isArray(payload.checklist) ? payload.checklist : [];
  const progress = payload.progress || { percent: 0, required_uploaded: 0, required_count: 0, approved_count: 0 };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6">
      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-lg shadow-slate-200/60">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">Secure document upload</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Mortgage preparation</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">{progress.required_uploaded}/{progress.required_count} required documents submitted</p>
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-2xl font-black text-sky-700 ring-1 ring-sky-100">{Math.min(Number(progress.percent || 0), 100)}%</div>
        </div>

        <div className="mb-4 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-sky-600 transition-all" style={{ width: `${Math.min(Number(progress.percent || 0), 100)}%` }} />
        </div>

        {notice && <p className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{notice}</p>}

        <div className="grid gap-3 md:grid-cols-2">
          {checklist.map((item) => (
            <article key={item.id} className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="line-clamp-1 font-black text-slate-950">{item.title}</h4>
                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                    {item.document?.original_filename || (item.is_required ? "Required" : "Optional")} {formatSize(item.document?.file_size_bytes)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(item.status)}`}>{String(item.status || "pending").replace(/_/g, " ")}</span>
              </div>

              {item.document ? (
                <button type="button" onClick={() => downloadDocument(item.document!.id, item.document!.original_filename)} className="mt-3 inline-flex rounded-full bg-white px-3 py-2 text-xs font-black text-sky-700 ring-1 ring-sky-100 hover:bg-sky-50">Download</button>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    onChange={(event) => selectFile(item.id, event.target.files?.[0] || null)}
                    className="min-w-0 text-xs font-semibold text-slate-600"
                  />
                  <button
                    type="button"
                    disabled={uploadingId === item.id || !selectedFiles[item.id]}
                    onClick={() => uploadDocument(item)}
                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-sky-700 disabled:opacity-60"
                  >
                    {uploadingId === item.id ? "Uploading..." : "Upload"}
                  </button>
                </div>
              )}
            </article>
          ))}
          {checklist.length === 0 && <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500 md:col-span-2">No document requirements have been assigned yet.</p>}
        </div>
      </div>
    </section>
  );
}

export default EmployeeDocumentChecklistWidget;
