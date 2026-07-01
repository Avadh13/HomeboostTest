import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

type MortgageRequest = {
  id: number;
  service_title: string | null;
  service_icon?: string | null;
  status: string;
  message_thread_id?: number | null;
  assigned_member_name?: string | null;
  preferred_contact_method?: string | null;
  preferred_time?: string | null;
  created_at: string;
};

type EmployeeMortgageRequestsPanelProps = {
  primary?: string;
};

const statusSteps = ["new", "contacted", "in_review", "appointment_booked", "documents_requested", "completed"];
const formatStatus = (status?: string | null) => (status || "new").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—");

const statusBadge = (status?: string | null) => {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "closed") return "bg-slate-100 text-slate-600";
  if (status === "appointment_booked") return "bg-amber-100 text-amber-700";
  if (status === "documents_requested") return "bg-orange-100 text-orange-700";
  if (status === "in_review") return "bg-violet-100 text-violet-700";
  return "bg-blue-100 text-blue-700";
};

function EmployeeMortgageRequestsPanel({ primary = "#2563eb" }: EmployeeMortgageRequestsPanelProps) {
  const [requests, setRequests] = useState<MortgageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/service-requests/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      })
      .catch(() => mounted && setRequests([]))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [token]);

  const latestRequests = useMemo(() => requests.slice(0, 4), [requests]);
  const activeCount = requests.filter((request) => !["completed", "closed"].includes(request.status)).length;

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Mortgage requests</p>
          <h2 className="text-2xl font-black md:text-3xl">My active mortgage support</h2>
          <p className="mt-2 text-sm text-slate-500">Track request status, advisor assignment, and next action.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">{activeCount} active</span>
          <Link to="/mortgage-request" className="btn-primary" style={{ background: primary }}>New Request</Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-slate-50 p-8 text-center font-bold text-slate-500">Loading mortgage requests...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {latestRequests.map((request) => {
            const currentIndex = Math.max(0, statusSteps.indexOf(request.status));
            return (
              <article key={request.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="text-2xl">{request.service_icon || "🏡"}</span>
                    <h3 className="mt-2 text-xl font-black text-slate-950">{request.service_title || "Mortgage Request"}</h3>
                    <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">Request #{request.id} · {formatDate(request.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusBadge(request.status)}`}>{formatStatus(request.status)}</span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-6">
                  {statusSteps.map((step, index) => <div key={step} className={`h-2 rounded-full ${index <= currentIndex ? "bg-blue-600" : "bg-white"}`} title={formatStatus(step)} />)}
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-600">
                  <p><b>Advisor:</b> {request.assigned_member_name || "Pending assignment"}</p>
                  <p><b>Preferred contact:</b> {formatStatus(request.preferred_contact_method)}</p>
                  {request.preferred_time && <p><b>Preferred time:</b> {request.preferred_time}</p>}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={request.message_thread_id ? "/employee/messages" : "/mortgage-request"} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700">
                    {request.message_thread_id ? "Open Advisor Chat" : "Update Request"}
                  </Link>
                  <Link to="/employee/appointments" className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50">Book Appointment</Link>
                </div>
              </article>
            );
          })}

          {latestRequests.length === 0 && (
            <div className="rounded-3xl bg-slate-50 p-8 text-center text-slate-500 xl:col-span-2">
              <p className="font-black">No mortgage requests yet.</p>
              <p className="mt-2 text-sm">Start with purchase, renewal/refinance, debt consolidation, self-employed, separation/divorce, or not sure yet.</p>
              <Link to="/mortgage-request" className="btn-primary mt-5" style={{ background: primary }}>Start Mortgage Request</Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default EmployeeMortgageRequestsPanel;
