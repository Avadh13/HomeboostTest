import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type Appointment = {
  id: number;
  topic: string;
  preferred_date?: string | null;
  message?: string | null;
  advisor_note?: string | null;
  meeting_link?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  employee_name: string;
  employee_email: string;
  team_member_name?: string | null;
  team_member_title?: string | null;
  employer_name?: string | null;
  partnership_slug?: string | null;
  hbt_name?: string | null;
};

const statusClasses: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-blue-50 text-blue-800 border-blue-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

const getTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

function AdminAppointments() {
  const toast = useToast();
  const token = localStorage.getItem("token");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/admin`, { headers });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Could not load appointments.");
        setAppointments([]);
        return;
      }

      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Admin appointments load failed:", error);
      toast.error("Could not load appointments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return appointments
      .filter((appointment) => statusFilter === "all" || appointment.status === statusFilter)
      .filter((appointment) => {
        if (!query) return true;
        const searchable = [
          appointment.topic,
          appointment.employee_name,
          appointment.employee_email,
          appointment.employer_name,
          appointment.partnership_slug,
          appointment.hbt_name,
          appointment.team_member_name,
          appointment.message,
          appointment.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) => getTime(b.created_at) - getTime(a.created_at));
  }, [appointments, search, statusFilter]);

  const updateStatus = async (appointment: Appointment, status: string) => {
    try {
      setUpdatingId(appointment.id);
      const response = await fetch(`${API_BASE_URL}/appointments/${appointment.id}/status`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          advisor_note: appointment.advisor_note || "",
          meeting_link: appointment.meeting_link || "",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Status update failed.");
        return;
      }

      toast.success("Appointment status updated.");
      await loadAppointments();
    } catch (error) {
      console.error("Admin appointment status update failed:", error);
      toast.error("Could not update appointment status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((item) => item.status === "pending").length,
      approved: appointments.filter((item) => item.status === "approved").length,
      completed: appointments.filter((item) => item.status === "completed").length,
      rejected: appointments.filter((item) => item.status === "rejected").length,
    };
  }, [appointments]);

  return (
    <AdminLayout title="Appointments">
      <div className="space-y-5">
        <section className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Platform Activity</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Appointment Requests</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">
            Monitor employee appointment requests, advisor responses, meeting links, and status across employer partnerships.
          </p>
          <button onClick={loadAppointments} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">Refresh</button>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          {[
            ["Total", stats.total, "bg-violet-50 text-violet-700"],
            ["Pending", stats.pending, "bg-amber-50 text-amber-700"],
            ["Approved", stats.approved, "bg-blue-50 text-blue-700"],
            ["Completed", stats.completed, "bg-emerald-50 text-emerald-700"],
            ["Rejected", stats.rejected, "bg-red-50 text-red-700"],
          ].map(([label, value, tone]) => (
            <div key={label} className="premium-card">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <h2 className={`mt-2 rounded-2xl px-3 py-2 text-3xl font-black ${tone}`}>{value}</h2>
            </div>
          ))}
        </section>

        <section className="premium-card overflow-hidden p-0">
          <div className="border-b border-slate-100 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-center">
              <input className="form-field" placeholder="Search employee, employer, topic, advisor..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
              <button onClick={loadAppointments} className="btn-secondary whitespace-nowrap">Refresh</button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center font-bold text-slate-500">Loading appointments...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No appointment requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Employer / HBT</th>
                    <th className="px-4 py-3">Topic</th>
                    <th className="px-4 py-3">Advisor Response</th>
                    <th className="px-4 py-3">Preferred</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Update</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="border-b align-top last:border-0 hover:bg-violet-50/40">
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-950">{appointment.employee_name}</p>
                        <p className="text-xs font-semibold text-slate-500">{appointment.employee_email}</p>
                        <p className="mt-1 text-[11px] text-slate-400">Requested {appointment.created_at ? new Date(appointment.created_at).toLocaleDateString() : "N/A"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-700">{appointment.employer_name || "—"}</p>
                        <p className="text-xs font-semibold text-violet-500">/{appointment.partnership_slug || "—"}</p>
                        <p className="mt-1 text-xs text-slate-500">{appointment.hbt_name || "No HBT"}</p>
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <p className="font-black text-slate-950">{appointment.topic}</p>
                        {appointment.team_member_name && <p className="mt-1 text-xs text-slate-500">For {appointment.team_member_name}</p>}
                        {appointment.message && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{appointment.message}</p>}
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        {appointment.meeting_link ? <a href={appointment.meeting_link} target="_blank" rel="noreferrer" className="font-black text-blue-700 hover:text-violet-700">Open meeting link</a> : <p className="text-slate-400">No link</p>}
                        {appointment.advisor_note && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">{appointment.advisor_note}</p>}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{appointment.preferred_date ? new Date(appointment.preferred_date).toLocaleString() : "Not specified"}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses[appointment.status] || statusClasses.pending}`}>{appointment.status}</span>
                      </td>
                      <td className="px-4 py-4">
                        <select className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-black" value={appointment.status} disabled={updatingId === appointment.id} onChange={(e) => updateStatus(appointment, e.target.value)}>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminAppointments;
