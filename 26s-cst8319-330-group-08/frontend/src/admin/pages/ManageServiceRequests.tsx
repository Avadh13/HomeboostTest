import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type MortgageRequest = {
  id: number;
  service_title: string | null;
  service_icon?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  preferred_contact_method: string;
  preferred_time?: string | null;
  message?: string | null;
  status: RequestStatus;
  source?: string | null;
  created_at: string;
  employer_name?: string | null;
  hbt_team_name?: string | null;
  assigned_member_name?: string | null;
};

type RequestStatus = "new" | "contacted" | "in_review" | "appointment_booked" | "documents_requested" | "completed" | "closed";

const statusOptions: Array<{ value: RequestStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_review", label: "In Review" },
  { value: "appointment_booked", label: "Follow-up Started" },
  { value: "documents_requested", label: "Documents Requested" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

const statusClass: Record<RequestStatus, string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-100",
  contacted: "bg-sky-50 text-sky-700 ring-sky-100",
  in_review: "bg-violet-50 text-violet-700 ring-violet-100",
  appointment_booked: "bg-amber-50 text-amber-700 ring-amber-100",
  documents_requested: "bg-orange-50 text-orange-700 ring-orange-100",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  closed: "bg-slate-100 text-slate-600 ring-slate-200",
};

const labelStatus = (status: string) => statusOptions.find((item) => item.value === status)?.label || status.replace(/_/g, " ");

function ManageServiceRequests() {
  const toast = useToast();
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const [requests, setRequests] = useState<MortgageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/service-requests/admin`, { headers });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to load mortgage requests.");
        return;
      }
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      toast.error("Failed to load mortgage requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const counts = useMemo(() => {
    return statusOptions.reduce<Record<string, number>>((acc, item) => {
      acc[item.value] = requests.filter((request) => request.status === item.value).length;
      return acc;
    }, { all: requests.length });
  }, [requests]);

  const updateRequestStatus = async (requestId: number, status: RequestStatus) => {
    try {
      setSavingId(requestId);
      const response = await fetch(`${API_BASE_URL}/service-requests/${requestId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to update request.");
        return;
      }
      setRequests((prev) => prev.map((request) => request.id === requestId ? { ...request, status } : request));
      toast.success("Request status updated.");
    } catch {
      toast.error("Failed to update request.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout title="Mortgage Requests">
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-6 text-white shadow-2xl md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">Intake Inbox</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">Mortgage service requests</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">Review new mortgage intake forms, track status, and prepare for advisor assignment in the next batch.</p>
            </div>
            <button onClick={loadRequests} className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">Refresh</button>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <button onClick={() => setStatusFilter("all")} className={`rounded-2xl px-4 py-3 text-left font-black shadow-sm ${statusFilter === "all" ? "bg-slate-950 text-white" : "bg-white text-slate-700"}`}>All <span className="block text-2xl">{counts.all || 0}</span></button>
          {statusOptions.map((status) => (
            <button key={status.value} onClick={() => setStatusFilter(status.value)} className={`rounded-2xl px-4 py-3 text-left font-black shadow-sm ${statusFilter === status.value ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}>{status.label}<span className="block text-2xl">{counts[status.value] || 0}</span></button>
          ))}
        </section>

        {loading ? (
          <div className="rounded-[2rem] bg-white p-8 text-center font-bold text-slate-500 shadow-xl">Loading mortgage requests...</div>
        ) : (
          <section className="grid gap-4">
            {filteredRequests.map((request) => (
              <article key={request.id} className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xl">{request.service_icon || "🏡"}</span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Request #{request.id}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${statusClass[request.status]}`}>{labelStatus(request.status)}</span>
                      {request.source && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{request.source.replace(/_/g, " ")}</span>}
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-slate-950">{request.service_title || "Mortgage Request"}</h2>
                    <p className="mt-2 text-sm text-slate-500">Submitted by <b>{request.full_name}</b> · {request.email}{request.phone ? ` · ${request.phone}` : ""}</p>
                    <p className="mt-1 text-sm text-slate-500">Preferred contact: {request.preferred_contact_method.replace(/_/g, " ")}{request.preferred_time ? ` · ${request.preferred_time}` : ""}</p>
                    {(request.employer_name || request.hbt_team_name) && <p className="mt-1 text-sm text-slate-500">{request.employer_name || "No employer"} · {request.hbt_team_name || "No HBT team"}</p>}
                    {request.message && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{request.message}</p>}
                  </div>
                  <div className="min-w-[220px] rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Update Status</p>
                    <select className="form-field mt-3 bg-white" value={request.status} disabled={savingId === request.id} onChange={(event) => updateRequestStatus(request.id, event.target.value as RequestStatus)}>
                      {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                    <p className="mt-3 text-xs font-semibold text-slate-500">Created: {new Date(request.created_at).toLocaleString()}</p>
                    {request.assigned_member_name && <p className="mt-2 text-xs font-semibold text-slate-500">Assigned: {request.assigned_member_name}</p>}
                  </div>
                </div>
              </article>
            ))}
            {filteredRequests.length === 0 && <div className="rounded-[2rem] bg-white p-8 text-center font-bold text-slate-500 shadow-xl">No mortgage requests found.</div>}
          </section>
        )}
      </div>
    </AdminLayout>
  );
}

export default ManageServiceRequests;