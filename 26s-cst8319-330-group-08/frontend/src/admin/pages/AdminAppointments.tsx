import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

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

function AdminAppointments() {
  const token = localStorage.getItem("token");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/admin`, { headers });
      const data = await response.json();

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Could not load appointments." });
        setAppointments([]);
        return;
      }

      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Admin appointments load failed:", error);
      setNotice({ type: "error", message: "Could not load appointments." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const updateStatus = async (appointment: Appointment, status: string) => {
    setNotice(null);
    try {
      setUpdatingId(appointment.id);
      const response = await fetch(`${API_BASE_URL}/appointments/${appointment.id}/status`, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          advisor_note: appointment.advisor_note || "",
          meeting_link: appointment.meeting_link || "",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Status update failed." });
        return;
      }

      setNotice({ type: "success", message: "Appointment status updated." });
      await loadAppointments();
    } catch (error) {
      console.error("Admin appointment status update failed:", error);
      setNotice({ type: "error", message: "Could not update appointment status." });
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
    };
  }, [appointments]);

  return (
    <AdminLayout title="Appointments">
      <div className="space-y-8">
        <section className="rounded-3xl bg-gradient-to-r from-slate-950 to-blue-950 p-8 text-white shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">Platform Activity</p>
          <h1 className="mt-3 text-4xl font-black">Appointment Requests</h1>
          <p className="mt-3 max-w-3xl text-blue-100">Monitor employee requests, advisor messages, and meeting links across employer partnerships.</p>
        </section>

        {notice && (
          <div className={`rounded-2xl border px-5 py-4 font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {notice.message}
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-4">
          {[
            ["Total", stats.total],
            ["Pending", stats.pending],
            ["Approved", stats.approved],
            ["Completed", stats.completed],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl bg-white p-6 shadow">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
              <h2 className="mt-2 text-4xl font-black text-slate-950">{value}</h2>
            </div>
          ))}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">All appointment requests</h2>
              <p className="text-sm text-slate-500">Newest requests first.</p>
            </div>
            <button onClick={loadAppointments} className="rounded-full bg-slate-100 px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-200">Refresh</button>
          </div>

          {loading ? (
            <p className="text-slate-500">Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-600">No appointment requests yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600">
                    <th className="p-4">Employee</th>
                    <th className="p-4">Employer</th>
                    <th className="p-4">HBT</th>
                    <th className="p-4">Topic</th>
                    <th className="p-4">Advisor Response</th>
                    <th className="p-4">Preferred</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="border-b align-top">
                      <td className="p-4">
                        <p className="font-black text-slate-950">{appointment.employee_name}</p>
                        <p className="text-slate-500">{appointment.employee_email}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold">{appointment.employer_name || "—"}</p>
                        <p className="text-slate-500">/{appointment.partnership_slug || "—"}</p>
                      </td>
                      <td className="p-4">{appointment.hbt_name || "—"}</td>
                      <td className="p-4">
                        <p className="font-semibold">{appointment.topic}</p>
                        {appointment.team_member_name && <p className="text-slate-500">For {appointment.team_member_name}</p>}
                      </td>
                      <td className="p-4 max-w-xs">
                        {appointment.meeting_link ? (
                          <a href={appointment.meeting_link} target="_blank" rel="noreferrer" className="font-bold text-blue-700 hover:underline">Open meeting link</a>
                        ) : (
                          <p className="text-slate-400">No link</p>
                        )}
                        {appointment.advisor_note && <p className="mt-2 line-clamp-3 text-slate-600">{appointment.advisor_note}</p>}
                      </td>
                      <td className="p-4">{appointment.preferred_date ? new Date(appointment.preferred_date).toLocaleString() : "Not specified"}</td>
                      <td className="p-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses[appointment.status] || statusClasses.pending}`}>{appointment.status}</span>
                      </td>
                      <td className="p-4">
                        <select
                          className="rounded-xl border border-slate-200 bg-white p-2"
                          value={appointment.status}
                          disabled={updatingId === appointment.id}
                          onChange={(e) => updateStatus(appointment, e.target.value)}
                        >
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
