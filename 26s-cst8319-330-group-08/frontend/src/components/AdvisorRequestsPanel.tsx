import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { useToast } from "./ToastProvider";

type RequestStatus = "new" | "contacted" | "in_review" | "appointment_booked" | "documents_requested" | "completed" | "closed";

type SupportRequest = {
  id: number;
  service_title: string | null;
  service_icon?: string | null;
  full_name: string;
  status: RequestStatus;
  message?: string | null;
};

const statusOptions: Array<{ value: RequestStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_review", label: "In Review" },
  { value: "appointment_booked", label: "Follow-up Started" },
  { value: "documents_requested", label: "Documents Requested" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

const statusLabel = (status: RequestStatus) => statusOptions.find((item) => item.value === status)?.label || status.replace(/_/g, " ");

function AdvisorRequestsPanel() {
  const toast = useToast();
  const token = localStorage.getItem("token");
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/service-requests/hbt`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message || "Failed to load requests.");
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      toast.error("Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const updateStatus = async (requestId: number, status: RequestStatus) => {
    try {
      setSavingId(requestId);
      const response = await fetch(`${API_BASE_URL}/service-requests/${requestId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message || "Failed to update request.");
      setRequests((prev) => prev.map((request) => (request.id === requestId ? { ...request, status } : request)));
      toast.success("Request updated.");
    } catch {
      toast.error("Failed to update request.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Advisor pipeline</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Client support requests</h2>
            <p className="mt-2 text-sm text-slate-500">Review assigned requests, update status, and continue the conversation in messages.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link to="/hbt/messages" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white">Open Messages</Link><button onClick={loadRequests} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">Refresh</button></div>
        </div>

        {loading ? <div className="rounded-3xl bg-slate-50 p-8 text-center font-bold text-slate-500">Loading requests...</div> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {requests.slice(0, 8).map((request) => (
              <article key={request.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-2xl">{request.service_icon || "🏡"}</p><h3 className="mt-2 text-xl font-black text-slate-950">{request.service_title || "Support Request"}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{request.full_name} · Request #{request.id}</p>{request.message && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{request.message}</p>}</div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{statusLabel(request.status)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2"><select className="form-field max-w-[220px] bg-white" value={request.status} disabled={savingId === request.id} onChange={(event) => updateStatus(request.id, event.target.value as RequestStatus)}>{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><Link to="/hbt/messages" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white">Open Chat</Link></div>
              </article>
            ))}
            {requests.length === 0 && <div className="rounded-3xl bg-slate-50 p-8 text-center font-bold text-slate-500 xl:col-span-2">No requests yet.</div>}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdvisorRequestsPanel;