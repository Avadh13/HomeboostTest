import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { useToast } from "../components/ToastProvider";

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

type TeamMember = {
  id: number;
  full_name: string;
  title?: string;
  email?: string;
};

type AvailableTime = {
  value: string;
  label: string;
};

type AdvisorDraft = {
  advisor_note: string;
  meeting_link: string;
};

type StatusFilter = "active" | "all" | "pending" | "approved" | "completed" | "rejected";
type SortBy = "newest" | "oldest" | "preferred_soonest" | "preferred_latest";

const today = new Date().toISOString().split("T")[0];

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

const toDateInput = (value?: string | null) => {
  if (!value) return today;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? today : date.toISOString().split("T")[0];
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const initials = (name?: string) =>
  (name || "Employee")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "E";

const getPreferredTimeStyle = (appointment: Appointment) => {
  if (!appointment.preferred_date) {
    return { className: "bg-slate-100 text-slate-600 border-slate-200", label: "No time selected" };
  }

  const activeStatus = appointment.status === "pending" || appointment.status === "approved";
  const preferredTime = getTime(appointment.preferred_date);
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (activeStatus && preferredTime < now) return { className: "bg-red-50 text-red-700 border-red-200", label: "Past due" };
  if (activeStatus && preferredTime - now <= twentyFourHours) return { className: "bg-amber-50 text-amber-800 border-amber-200", label: "Soon" };
  if (appointment.status === "completed") return { className: "bg-emerald-50 text-emerald-800 border-emerald-200", label: "Resolved" };
  return { className: "bg-slate-100 text-slate-700 border-slate-200", label: "Scheduled" };
};

function HBTAppointments() {
  const toast = useToast();
  const token = localStorage.getItem("token");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [drafts, setDrafts] = useState<Record<number, AdvisorDraft>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleAdvisorId, setRescheduleAdvisorId] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState(today);
  const [reschedulePreferredDate, setReschedulePreferredDate] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

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
      toast.error("Could not load appointment requests.");
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/advisor-availability`, { headers });
      const data = await response.json();
      setTeamMembers(Array.isArray(data.team_members) ? data.team_members : []);
    } catch {
      setTeamMembers([]);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadTeamMembers();
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
    const draft = drafts[appointment.id] || { advisor_note: "", meeting_link: "" };

    try {
      setUpdatingId(appointment.id);
      const response = await fetch(`${API_BASE_URL}/appointments/${appointment.id}/status`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status, advisor_note: draft.advisor_note, meeting_link: draft.meeting_link }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Appointment update failed.");
        return;
      }

      toast.success(status === appointment.status ? "Advisor note/link saved." : `Appointment marked ${status}.`);
      setSelectedAppointment(null);
      await loadAppointments();
    } catch (error) {
      console.error("Appointment update failed:", error);
      toast.error("Could not update appointment.");
    } finally {
      setUpdatingId(null);
    }
  };

  const openReschedule = (appointment: Appointment) => {
    const matchedAdvisor = teamMembers.find((member) => member.full_name === appointment.team_member_name);
    setSelectedAppointment(null);
    setRescheduleTarget(appointment);
    setRescheduleAdvisorId(matchedAdvisor ? String(matchedAdvisor.id) : teamMembers[0] ? String(teamMembers[0].id) : "");
    setRescheduleDate(toDateInput(appointment.preferred_date));
    setReschedulePreferredDate("");
    setRescheduleNote(appointment.advisor_note || "");
    setAvailableTimes([]);
  };

  const closeReschedule = () => {
    setRescheduleTarget(null);
    setRescheduleAdvisorId("");
    setReschedulePreferredDate("");
    setAvailableTimes([]);
  };

  const loadAvailableTimes = async () => {
    setAvailableTimes([]);
    setReschedulePreferredDate("");

    if (!rescheduleTarget || !rescheduleAdvisorId || !rescheduleDate) return;

    try {
      setLoadingTimes(true);
      const response = await fetch(`${API_BASE_URL}/appointments/available-times?team_member_id=${rescheduleAdvisorId}&date=${rescheduleDate}`, { headers });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Could not load available times.");
        return;
      }

      setAvailableTimes(Array.isArray(data.available_times) ? data.available_times : []);
    } catch (error) {
      console.error("Load reschedule times failed:", error);
      toast.error("Could not load available times.");
    } finally {
      setLoadingTimes(false);
    }
  };

  useEffect(() => {
    loadAvailableTimes();
  }, [rescheduleTarget, rescheduleAdvisorId, rescheduleDate]);

  const submitReschedule = async () => {
    if (!rescheduleTarget) return;

    if (!rescheduleAdvisorId || !reschedulePreferredDate) {
      toast.warning("Select advisor and new available time.");
      return;
    }

    const draft = drafts[rescheduleTarget.id] || { advisor_note: "", meeting_link: "" };

    try {
      setUpdatingId(rescheduleTarget.id);
      const response = await fetch(`${API_BASE_URL}/appointments/${rescheduleTarget.id}/reschedule`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          team_member_id: rescheduleAdvisorId,
          preferred_date: reschedulePreferredDate,
          advisor_note: rescheduleNote,
          meeting_link: draft.meeting_link,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Reschedule failed.");
        await loadAvailableTimes();
        return;
      }

      toast.success("Appointment rescheduled and employee notified.");
      closeReschedule();
      await loadAppointments();
    } catch (error) {
      console.error("Reschedule failed:", error);
      toast.error("Could not reschedule appointment.");
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelAppointment = async (appointment: Appointment) => {
    const reason = window.prompt("Why are you cancelling this appointment?", "Schedule conflict");
    if (reason === null) return;

    try {
      setUpdatingId(appointment.id);
      const response = await fetch(`${API_BASE_URL}/appointments/${appointment.id}/cancel`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ cancel_reason: reason }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Cancel failed.");
        return;
      }

      toast.success("Appointment cancelled and employee notified.");
      setSelectedAppointment(null);
      await loadAppointments();
    } catch (error) {
      console.error("Cancel failed:", error);
      toast.error("Could not cancel appointment.");
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter((item) => item.status === "pending").length,
    approved: appointments.filter((item) => item.status === "approved").length,
    completed: appointments.filter((item) => item.status === "completed").length,
    rejected: appointments.filter((item) => item.status === "rejected").length,
  }), [appointments]);

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return appointments
      .filter((appointment) => {
        if (statusFilter === "active") return appointment.status === "pending" || appointment.status === "approved";
        if (statusFilter === "all") return true;
        return appointment.status === statusFilter;
      })
      .filter((appointment) => {
        if (!normalizedSearch) return true;
        const searchable = [appointment.topic, appointment.employee_name, appointment.employee_email, appointment.employer_name, appointment.partnership_slug, appointment.team_member_name, appointment.message, appointment.advisor_note, appointment.meeting_link, appointment.status].filter(Boolean).join(" ").toLowerCase();
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

  const activeSelectedAppointment = selectedAppointment ? appointments.find((appointment) => appointment.id === selectedAppointment.id) || selectedAppointment : null;

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="theme-panel">
          <Link to="/hbt/dashboard" className="text-sm font-black text-violet-200 hover:text-white">← Back to HBT dashboard</Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Appointment Requests</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-violet-100 md:text-base">Compact advisor queue. Open any card for notes, meeting link, reschedule, cancel, approve, reject, or complete actions.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          {[
            ["Total", stats.total, "all"],
            ["Pending", stats.pending, "pending"],
            ["Approved", stats.approved, "approved"],
            ["Completed", stats.completed, "completed"],
            ["Rejected", stats.rejected, "rejected"],
          ].map(([label, value, filter]) => (
            <button key={String(label)} onClick={() => setStatusFilter(filter as StatusFilter)} className={`premium-card text-left ${statusFilter === filter ? "ring-4 ring-violet-100" : ""}`}>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">{value}</h2>
            </button>
          ))}
        </section>

        <section className="premium-card overflow-hidden p-0">
          <div className="border-b border-slate-100 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Operations</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Team appointment queue</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Showing {filteredAppointments.length} of {appointments.length} appointment requests.</p>
              </div>
              <button onClick={loadAppointments} className="btn-secondary">Refresh</button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_190px_210px_auto]">
              <input className="form-field" placeholder="Search employee, email, company, topic, meeting link..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              <select className="form-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                <option value="active">Active only</option>
                <option value="all">All meetings</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
              <select className="form-field" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}>
                <option value="newest">Newest created</option>
                <option value="oldest">Oldest created</option>
                <option value="preferred_soonest">Preferred soonest</option>
                <option value="preferred_latest">Preferred latest</option>
              </select>
              <button onClick={clearFilters} className="btn-dark whitespace-nowrap">Reset</button>
            </div>
          </div>

          <div className="p-4 md:p-5">
            {loading ? (
              <p className="text-sm font-bold text-slate-500">Loading appointment requests...</p>
            ) : appointments.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-600">No appointment requests yet.</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-600">No appointments match the selected filters.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredAppointments.map((appointment) => {
                  const preferredTimeStyle = getPreferredTimeStyle(appointment);
                  const hasAdvisorResponse = Boolean(appointment.meeting_link || appointment.advisor_note);

                  return (
                    <article key={appointment.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-violet-700 shadow-sm">{initials(appointment.employee_name)}</div>
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-lg font-black text-slate-950">{appointment.topic}</h3>
                            <p className="mt-1 truncate text-sm font-semibold text-slate-500">{appointment.employee_name}</p>
                            <p className="truncate text-xs font-semibold text-slate-400">{appointment.employee_email}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase ${statusClasses[appointment.status] || statusClasses.pending}`}>{appointment.status}</span>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm">
                        <div className={`rounded-2xl border px-3 py-2 font-bold ${preferredTimeStyle.className}`}>
                          <p className="truncate">{formatDateTime(appointment.preferred_date)}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.16em]">{preferredTimeStyle.label}</p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-slate-600">
                          <p className="truncate"><strong>Advisor:</strong> {appointment.team_member_name || "Any available team member"}</p>
                          <p className="truncate text-xs font-semibold text-slate-400">{appointment.employer_name || "Employer"} / {appointment.partnership_slug || "partnership"}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${hasAdvisorResponse ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{hasAdvisorResponse ? "Response added" : "No response yet"}</span>
                        <button onClick={() => setSelectedAppointment(appointment)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-violet-700">Open details</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {activeSelectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl md:p-7">
            {(() => {
              const appointment = activeSelectedAppointment;
              const draft = drafts[appointment.id] || { advisor_note: "", meeting_link: "" };
              const preferredTimeStyle = getPreferredTimeStyle(appointment);
              const isClosed = appointment.status === "completed" || appointment.status === "rejected";

              return (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Appointment details</p>
                      <h2 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">{appointment.topic}</h2>
                      <p className="mt-2 text-sm font-semibold text-slate-500">{appointment.employee_name} · {appointment.employee_email}</p>
                      <p className="mt-1 text-sm text-slate-500">{appointment.employer_name || "Employer"} / {appointment.partnership_slug || "partnership"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${statusClasses[appointment.status] || statusClasses.pending}`}>{appointment.status}</span>
                      <button onClick={() => setSelectedAppointment(null)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
                    <p className="rounded-2xl bg-slate-50 px-4 py-3"><strong>Requested expert:</strong> {appointment.team_member_name || "Any available team member"}</p>
                    <div className={`rounded-2xl border px-4 py-3 font-bold ${preferredTimeStyle.className}`}>
                      <p>Preferred time: {formatDateTime(appointment.preferred_date)}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em]">{preferredTimeStyle.label}</p>
                    </div>
                  </div>

                  {appointment.message && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">{appointment.message}</p>}

                  <div className="mt-5 rounded-3xl border border-violet-100 bg-white p-4 md:p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Advisor response</p>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">Google Meet / Zoom link</span>
                        <input className="form-field" placeholder="https://meet.google.com/... or https://zoom.us/..." value={draft.meeting_link} onChange={(e) => updateDraft(appointment.id, "meeting_link", e.target.value)} />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">Message to employee</span>
                        <textarea className="form-field min-h-28" placeholder="Example: Hi, here is the meeting link for our call." value={draft.advisor_note} onChange={(e) => updateDraft(appointment.id, "advisor_note", e.target.value)} />
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button disabled={updatingId === appointment.id} onClick={() => updateAppointment(appointment, appointment.status)} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">{updatingId === appointment.id ? "Saving..." : "Save Note/Link"}</button>
                    <button disabled={updatingId === appointment.id || isClosed} onClick={() => openReschedule(appointment)} className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40">Reschedule</button>
                    <button disabled={updatingId === appointment.id || isClosed} onClick={() => cancelAppointment(appointment)} className="btn-danger disabled:cursor-not-allowed disabled:opacity-40">Cancel</button>
                    {[["approved", "Approve"], ["rejected", "Reject"], ["completed", "Complete"], ["pending", "Reset Pending"]].map(([status, label]) => (
                      <button key={status} disabled={updatingId === appointment.id || appointment.status === status} onClick={() => updateAppointment(appointment, status)} className="btn-dark disabled:cursor-not-allowed disabled:opacity-40">{updatingId === appointment.id ? "Updating..." : label}</button>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Reschedule appointment</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">{rescheduleTarget.topic}</h2>
                <p className="mt-1 text-sm text-slate-500">{rescheduleTarget.employee_name} · {rescheduleTarget.employee_email}</p>
              </div>
              <button onClick={closeReschedule} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Advisor</span>
                <select className="form-field" value={rescheduleAdvisorId} onChange={(e) => setRescheduleAdvisorId(e.target.value)}>
                  <option value="">Select advisor</option>
                  {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name} — {member.title || "Advisor"}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">New date</span>
                <input type="date" min={today} className="form-field" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
              </label>

              <div>
                <span className="mb-2 block text-sm font-bold text-slate-700">Available 1-hour times</span>
                {!rescheduleAdvisorId ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Select an advisor first.</div>
                ) : loadingTimes ? (
                  <div className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">Loading available times...</div>
                ) : availableTimes.length === 0 ? (
                  <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">No available times for this advisor/date. Try another date.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableTimes.map((time) => (
                      <button key={time.value} type="button" onClick={() => setReschedulePreferredDate(time.value)} className={`rounded-2xl border px-4 py-3 text-left font-bold transition ${reschedulePreferredDate === time.value ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}>{time.label}</button>
                    ))}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Message to employee</span>
                <textarea className="form-field min-h-24" value={rescheduleNote} onChange={(e) => setRescheduleNote(e.target.value)} placeholder="Example: We moved your meeting to this new time." />
              </label>
            </div>

            <button disabled={updatingId === rescheduleTarget.id || loadingTimes} onClick={submitReschedule} className="btn-primary mt-6 w-full disabled:opacity-50">{updatingId === rescheduleTarget.id ? "Rescheduling..." : "Confirm Reschedule"}</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default HBTAppointments;
