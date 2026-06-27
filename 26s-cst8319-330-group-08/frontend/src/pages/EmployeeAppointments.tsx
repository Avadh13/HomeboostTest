import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

type TeamMember = {
  id: number;
  full_name: string;
  title: string;
  email: string;
};

type Appointment = {
  id: number;
  topic: string;
  preferred_date?: string | null;
  message?: string | null;
  status: string;
  created_at: string;
  team_member_name?: string | null;
  team_member_title?: string | null;
  employer_name?: string | null;
  hbt_name?: string | null;
};

const statusClasses: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-blue-50 text-blue-800 border-blue-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

function EmployeeAppointments() {
  const token = localStorage.getItem("token");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [teamMemberId, setTeamMemberId] = useState("");
  const [topic, setTopic] = useState("Mortgage readiness call");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [portalRes, appointmentRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employee-portal`, { headers }),
        fetch(`${API_BASE_URL}/appointments/my`, { headers }),
      ]);

      const portalData = await portalRes.json();
      const appointmentData = await appointmentRes.json();

      setTeamMembers(portalData.status === "success" && Array.isArray(portalData.team_members) ? portalData.team_members : []);
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
    } catch (error) {
      console.error("Appointment page load failed:", error);
      setNotice({ type: "error", message: "Could not load appointment data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!topic.trim()) {
      setNotice({ type: "error", message: "Please enter an appointment topic." });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/appointments`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_member_id: teamMemberId || null,
          topic: topic.trim(),
          preferred_date: preferredDate || null,
          message: message.trim() || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Appointment request failed." });
        return;
      }

      setNotice({ type: "success", message: "Appointment request submitted successfully." });
      setTeamMemberId("");
      setTopic("Mortgage readiness call");
      setPreferredDate("");
      setMessage("");
      await loadData();
    } catch (error) {
      console.error("Appointment submit failed:", error);
      setNotice({ type: "error", message: "Could not submit appointment request." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] bg-gradient-to-br from-blue-950 to-indigo-900 p-8 text-white shadow-xl">
          <Link to="/employee-portal" className="text-sm font-bold text-blue-200 hover:text-white">← Back to portal</Link>
          <h1 className="mt-4 text-4xl font-black">Appointment Requests</h1>
          <p className="mt-3 max-w-2xl text-blue-100">Request a call with your Home Buying Team and track the status here.</p>
        </header>

        {notice && (
          <div className={`rounded-2xl border px-5 py-4 font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {notice.message}
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={submitAppointment} className="rounded-[2rem] bg-white p-7 shadow-xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">New request</p>
            <h2 className="mt-2 text-3xl font-black">Book time with an expert</h2>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Team member</span>
                <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" value={teamMemberId} onChange={(e) => setTeamMemberId(e.target.value)}>
                  <option value="">Any available team member</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.full_name} — {member.title}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Topic</span>
                <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" value={topic} onChange={(e) => setTopic(e.target.value)} required />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Preferred date and time</span>
                <input type="datetime-local" className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Message</span>
                <textarea className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell the team what you want help with." />
              </label>
            </div>

            <button disabled={saving} className="btn-primary mt-6 w-full disabled:opacity-60">
              {saving ? "Submitting..." : "Submit Request"}
            </button>
          </form>

          <section className="rounded-[2rem] bg-white p-7 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">History</p>
                <h2 className="text-3xl font-black">My requests</h2>
              </div>
              <button onClick={loadData} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Refresh</button>
            </div>

            {loading ? (
              <p className="text-slate-500">Loading appointments...</p>
            ) : appointments.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-600">No appointment requests yet.</div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <article key={appointment.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-slate-950">{appointment.topic}</h3>
                        <p className="mt-1 text-sm text-slate-500">{appointment.team_member_name || "Any available team member"}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses[appointment.status] || statusClasses.pending}`}>{appointment.status}</span>
                    </div>
                    {appointment.preferred_date && <p className="mt-3 text-sm text-slate-700"><strong>Preferred:</strong> {new Date(appointment.preferred_date).toLocaleString()}</p>}
                    {appointment.message && <p className="mt-3 text-sm leading-relaxed text-slate-600">{appointment.message}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

export default EmployeeAppointments;
