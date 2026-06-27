import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

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
};

type AdvisorDraft = {
  advisor_note: string;
  meeting_link: string;
};

type StatusFilter = "active" | "all" | "pending" | "approved" | "completed" | "rejected";
type SortBy = "newest" | "oldest" | "preferred_soonest" | "preferred_latest";

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

function HBTAppointments() {
  const token = localStorage.getItem("token");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [drafts, setDrafts] = useState<Record<number, AdvisorDraft>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const headers = { Authorization: `Bearer ${token}` };

  const syncDrafts = (items: Appointment[]) => {
    const nextDrafts: Record<number, AdvisorDraft> = {};
    items.forEach((item) => {
      nextDrafts[item.id] = {
        advisor_note: item.advisor_note || "",
        meeting_link: item.meeting_link || "",
      };
    });
    setDrafts(nextDrafts);
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/hbt`, { headers });
      const data = await response.json();
      const items = Array.isArray(data) ? data : [];
      setAppointments(items);
      syncDrafts(items);
    } catch (error) {
      console.error("Failed to load HBT appointments:", error);
      setNotice({ type: "error", message: "Could not load appointment requests." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const updateDraft = (id: number, field: keyof AdvisorDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        advisor_note: prev[id]?.advisor_note || "",
        meeting_link: prev[id]?.meeting_link || "",
        [field]: value,
      },
    }));
  };

  const updateAppointment = async (appointment: Appointment, status: string) => {
    setNotice(null);
    const draft = drafts[appointment.id] || { advisor_note: "", meeting_link: "" };

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
          advisor_note: draft.advisor_note,
          meeting_link: draft.meeting_link,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Appointment update failed." });
        return;
      }

      setNotice({ type: "success", message: "Appointment updated. Employee can now see the advisor note and meeting link." });
      await loadAppointments();
    } catch (error) {
      console.error("Appointment update failed:", error);
      setNotice({ type: "error", message: "Could not update appointment." });
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

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return appointments
      .filter((appointment) => {
        if (statusFilter === "active") {
          return appointment.status === "pending" || appointment.status === "approved";
        }

        if (statusFilter === "all") return true;

        return appointment.status === statusFilter;
      })
      .filter((appointment) => {
        if (!normalizedSearch) return true;

        const searchable = [
          appointment.topic,
          appointment.employee_name,
          appointment.employee_email,
          appointment.employer_name,
          appointment.partnership_slug,
          appointment.team_member_name,
          appointment.message,
          appointment.advisor_note,
          appointment.meeting_link,
          appointment.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return getTime(a.created_at) - getTime(b.created_at);
        if (sortBy === "preferred_soonest") return getTime(a.preferred_date) - getTime(b.preferred_date);
        if (sortBy === "preferred_latest") return getTime(b.preferred_date) - getTime(a.preferred_date);
        return getTime(b.created_at) - getTime(a.created_at);
      });
  }, [appointments, searchTerm, sortBy, statusFilter]);

  const clearFilters = () => {
    setStatusFilter("active");
    setSearchTerm("");
    setSortBy("newest");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-blue-950 p-8 text-white shadow-xl">
          <Link to="/hbt/dashboard" className="text-sm font-bold text-blue-200 hover:text-white">← Back to HBT dashboard</Link>
          <h1 className="mt-4 text-4xl font-black">Appointment Requests</h1>
          <p className="mt-3 max-w-2xl text-blue-100">Review employee appointment requests, paste Google Meet or Zoom links, and send advisor notes.</p>
        </header>

        {notice && (
          <div className={`rounded-2xl border px-5 py-4 font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {notice.message}
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-5">
          {[
            ["Total", stats.total, "all"],
            ["Pending", stats.pending, "pending"],
            ["Approved", stats.approved, "approved"],
            ["Completed", stats.completed, "completed"],
            ["Rejected", stats.rejected, "rejected"],
          ].map(([label, value, filter]) => (
            <button
              key={label}
              onClick={() => setStatusFilter(filter as StatusFilter)}
              className={`rounded-3xl bg-white p-6 text-left shadow transition hover:-translate-y-1 hover:shadow-lg ${statusFilter === filter ? "ring-4 ring-blue-100" : ""}`}
            >
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
              <h2 className="mt-2 text-4xl font-black text-slate-950">{value}</h2>
            </button>
          ))}
        </section>

        <section className="rounded-[2rem] bg-white p-7 shadow-xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Operations</p>
              <h2 className="text-3xl font-black">Team appointment queue</h2>
              <p className="mt-2 text-sm text-slate-500">
                Showing {filteredAppointments.length} of {appointments.length} appointment requests.
              </p>
            </div>
            <button onClick={loadAppointments} className="rounded-full bg-slate-100 px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-200">Refresh</button>
          </div>

          <div className="mb-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.7fr_0.7fr_auto]">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Search</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="Search employee, email, company, topic, meeting link..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Status</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                >
                  <option value="active">Active only</option>
                  <option value="all">All meetings</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Sort</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortBy)}
                >
                  <option value="newest">Newest created</option>
                  <option value="oldest">Oldest created</option>
                  <option value="preferred_soonest">Preferred soonest</option>
                  <option value="preferred_latest">Preferred latest</option>
                </select>
              </label>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-blue-700 lg:w-auto"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ["active", "Active"],
                ["pending", "Pending"],
                ["approved", "Approved"],
                ["completed", "Completed"],
                ["rejected", "Rejected"],
                ["all", "All"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value as StatusFilter)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    statusFilter === value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-slate-500">Loading appointment requests...</p>
          ) : appointments.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-600">No appointment requests yet.</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-600">No appointments match the selected filters.</div>
          ) : (
            <div className="space-y-5">
              {filteredAppointments.map((appointment) => {
                const draft = drafts[appointment.id] || { advisor_note: "", meeting_link: "" };

                return (
                  <article key={appointment.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-black text-slate-950">{appointment.topic}</h3>
                        <p className="mt-1 text-sm text-slate-500">{appointment.employee_name} · {appointment.employee_email}</p>
                        <p className="mt-1 text-sm text-slate-500">{appointment.employer_name || "Employer"} / {appointment.partnership_slug || "partnership"}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses[appointment.status] || statusClasses.pending}`}>{appointment.status}</span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                      <p><strong>Requested expert:</strong> {appointment.team_member_name || "Any available team member"}</p>
                      <p><strong>Preferred time:</strong> {appointment.preferred_date ? new Date(appointment.preferred_date).toLocaleString() : "Not specified"}</p>
                    </div>

                    {appointment.message && <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-relaxed text-slate-600">{appointment.message}</p>}

                    <div className="mt-5 rounded-3xl border border-blue-100 bg-white p-5">
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Advisor response</p>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-slate-700">Google Meet / Zoom link</span>
                          <input
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            placeholder="https://meet.google.com/... or https://zoom.us/..."
                            value={draft.meeting_link}
                            onChange={(e) => updateDraft(appointment.id, "meeting_link", e.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-slate-700">Message to employee</span>
                          <textarea
                            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            placeholder="Example: Hi, here is the meeting link for our call. Please bring your mortgage documents."
                            value={draft.advisor_note}
                            onChange={(e) => updateDraft(appointment.id, "advisor_note", e.target.value)}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        disabled={updatingId === appointment.id}
                        onClick={() => updateAppointment(appointment, appointment.status)}
                        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {updatingId === appointment.id ? "Saving..." : "Save Note/Link"}
                      </button>

                      {[
                        ["approved", "Approve"],
                        ["rejected", "Reject"],
                        ["completed", "Complete"],
                        ["pending", "Reset Pending"],
                      ].map(([status, label]) => (
                        <button
                          key={status}
                          disabled={updatingId === appointment.id || appointment.status === status}
                          onClick={() => updateAppointment(appointment, status)}
                          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {updatingId === appointment.id ? "Updating..." : label}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default HBTAppointments;
