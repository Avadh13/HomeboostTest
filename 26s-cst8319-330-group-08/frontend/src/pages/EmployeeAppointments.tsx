import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

type TeamMember = {
  id: number;
  full_name: string;
  title: string;
  email: string;
};

type AvailableTime = {
  value: string;
  label: string;
};

type Appointment = {
  id: number;
  topic: string;
  preferred_date?: string | null;
  message?: string | null;
  advisor_note?: string | null;
  meeting_link?: string | null;
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

const today = new Date().toISOString().split("T")[0];

function EmployeeAppointments() {
  const token = localStorage.getItem("token");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [teamMemberId, setTeamMemberId] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [preferredDate, setPreferredDate] = useState("");
  const [topic, setTopic] = useState("Mortgage readiness call");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingTimes, setLoadingTimes] = useState(false);
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

  const loadAvailableTimes = async () => {
    setAvailableTimes([]);
    setPreferredDate("");

    if (!teamMemberId || !selectedDate) return;

    try {
      setLoadingTimes(true);
      const response = await fetch(
        `${API_BASE_URL}/appointments/available-times?team_member_id=${teamMemberId}&date=${selectedDate}`,
        { headers }
      );

      const data = await response.json();

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Could not load available times." });
        return;
      }

      setAvailableTimes(Array.isArray(data.available_times) ? data.available_times : []);
    } catch (error) {
      console.error("Available times load failed:", error);
      setNotice({ type: "error", message: "Could not load available times. Please try again." });
    } finally {
      setLoadingTimes(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadAvailableTimes();
  }, [teamMemberId, selectedDate]);

  const submitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!teamMemberId) {
      setNotice({ type: "error", message: "Please select an advisor." });
      return;
    }

    if (!preferredDate) {
      setNotice({ type: "error", message: "Please select an available 1-hour meeting time." });
      return;
    }

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
          team_member_id: teamMemberId,
          topic: topic.trim(),
          preferred_date: preferredDate,
          message: message.trim() || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Appointment request failed." });
        await loadAvailableTimes();
        return;
      }

      setNotice({ type: "success", message: "Appointment request submitted successfully." });
      setTeamMemberId("");
      setTopic("Mortgage readiness call");
      setSelectedDate(today);
      setPreferredDate("");
      setMessage("");
      setAvailableTimes([]);
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
          <p className="mt-3 max-w-2xl text-blue-100">Select an advisor, choose a date, and pick an available 1-hour meeting time.</p>
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
            <p className="mt-3 text-sm text-slate-500">Meetings are fixed at 1 hour. Already-booked advisor times are removed automatically.</p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Advisor</span>
                <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" value={teamMemberId} onChange={(e) => setTeamMemberId(e.target.value)} required>
                  <option value="">Select advisor</option>
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
                <span className="mb-2 block text-sm font-bold text-slate-700">Date</span>
                <input type="date" min={today} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required />
              </label>

              <div>
                <span className="mb-2 block text-sm font-bold text-slate-700">Available 1-hour times</span>
                {!teamMemberId ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Select an advisor first.</div>
                ) : loadingTimes ? (
                  <div className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">Loading available times...</div>
                ) : availableTimes.length === 0 ? (
                  <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">No available times for this advisor/date. Try another date.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableTimes.map((time) => (
                      <button
                        key={time.value}
                        type="button"
                        onClick={() => setPreferredDate(time.value)}
                        className={`rounded-2xl border px-4 py-3 text-left font-bold transition ${
                          preferredDate === time.value
                            ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {time.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Message</span>
                <textarea className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell the team what you want help with." />
              </label>
            </div>

            <button disabled={saving || loadingTimes} className="btn-primary mt-6 w-full disabled:opacity-60">
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
                        <p className="mt-1 text-sm text-slate-500">{appointment.team_member_name || "Advisor"}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses[appointment.status] || statusClasses.pending}`}>{appointment.status}</span>
                    </div>

                    {appointment.preferred_date && <p className="mt-3 text-sm text-slate-700"><strong>Preferred:</strong> {new Date(appointment.preferred_date).toLocaleString()} · 1 hour</p>}
                    {appointment.message && <p className="mt-3 text-sm leading-relaxed text-slate-600">{appointment.message}</p>}

                    {(appointment.meeting_link || appointment.advisor_note) && (
                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">Advisor response</p>
                        {appointment.advisor_note && <p className="mt-3 text-sm leading-relaxed text-slate-700">{appointment.advisor_note}</p>}
                        {appointment.meeting_link && (
                          <a href={appointment.meeting_link} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700">
                            Open Meeting Link
                          </a>
                        )}
                      </div>
                    )}
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
