import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
import { useToast } from "../components/ToastProvider";

type Appointment = {
  id: number;
  topic: string;
  preferred_date?: string | null;
  status: string;
  employee_name: string;
  employee_email: string;
  employer_name?: string | null;
  meeting_link?: string | null;
};

type QuizSubmission = {
  id: number;
  quiz_title: string;
  employee_name: string;
  employee_email: string;
  company_name: string;
  submitted_at: string;
  follow_up_status?: string;
};

type MessageThread = {
  id: number;
  subject: string;
  employee_name?: string;
  company_name?: string;
  status: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
};

type LeadTodo = {
  id: number;
  label: string;
  is_completed: number;
};

type LeadAssignment = {
  id: number;
  employee_user_id: number;
  employee_name: string;
  employee_email: string;
  employer_name: string;
  partnership_slug: string;
  status: string;
  progress_percent: number;
  todos: LeadTodo[];
};

type PriorityAction = {
  label: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone: string;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatTime = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

const statusClass = (status?: string) => {
  if (status === "completed" || status === "approved" || status === "closed") return "bg-emerald-100 text-emerald-700";
  if (status === "pending" || status === "new") return "bg-amber-100 text-amber-700";
  if (status === "cancelled" || status === "not_interested" || status === "rejected") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
};

const initials = (name?: string) =>
  (name || "Client")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "C";

function HBTMemberDashboard() {
  const toast = useToast();
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
  const [leadAssignments, setLeadAssignments] = useState<LeadAssignment[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingTodoId, setSavingTodoId] = useState<number | null>(null);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [quizRes, appointmentRes, notificationRes, messageRes, leadRes] = await Promise.all([
        fetch(`${API_BASE_URL}/quizzes/submissions`, { headers }),
        fetch(`${API_BASE_URL}/appointments/hbt`, { headers }),
        fetch(`${API_BASE_URL}/notifications/unread-count`, { headers }),
        fetch(`${API_BASE_URL}/messages/threads`, { headers }),
        fetch(`${API_BASE_URL}/lead-progress/hbt`, { headers }),
      ]);

      const quizData = await quizRes.json();
      const appointmentData = await appointmentRes.json();
      const notificationData = await notificationRes.json();
      const messageData = await messageRes.json();
      const leadData = await leadRes.json();

      setSubmissions(Array.isArray(quizData) ? quizData : []);
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
      setUnreadNotifications(Number(notificationData.unread_count || 0));
      setMessageThreads(Array.isArray(messageData) ? messageData : []);
      setLeadAssignments(Array.isArray(leadData.assignments) ? leadData.assignments : []);
    } catch (error) {
      console.error("Failed to load HBT member dashboard:", error);
      toast.error("Failed to load HBT member dashboard.");
      setSubmissions([]);
      setAppointments([]);
      setMessageThreads([]);
      setLeadAssignments([]);
      setUnreadNotifications(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const unreadMessages = messageThreads.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);
  const pendingAppointments = appointments.filter((item) => item.status === "pending").length;
  const openLeads = leadAssignments.filter((item) => Number(item.progress_percent || 0) < 100).length;
  const completedLeads = leadAssignments.filter((item) => Number(item.progress_percent || 0) >= 100).length;
  const averageProgress = leadAssignments.length
    ? Math.round(leadAssignments.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / leadAssignments.length)
    : 0;

  const sortedAppointments = [...appointments].sort((a, b) => {
    const aTime = a.preferred_date ? new Date(a.preferred_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.preferred_date ? new Date(b.preferred_date).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  const nextAppointments = sortedAppointments.filter((item) => item.status !== "completed" && item.status !== "cancelled" && item.status !== "rejected").slice(0, 4);
  const activeLeads = [...leadAssignments]
    .sort((a, b) => Number(a.progress_percent || 0) - Number(b.progress_percent || 0))
    .slice(0, 5);
  const latestMessages = messageThreads.slice(0, 5);
  const latestSubmissions = submissions.slice(0, 5);

  const priorityAction: PriorityAction = useMemo(() => {
    const unreadThread = messageThreads.find((thread) => Number(thread.unread_count || 0) > 0);
    if (unreadThread) {
      return {
        label: "Reply first",
        title: unreadThread.employee_name || unreadThread.subject,
        body: unreadThread.last_message || "A client is waiting for your response.",
        href: "/hbt/messages",
        cta: "Open inbox",
        tone: "from-indigo-600 to-violet-700",
      };
    }

    const pendingAppointment = appointments.find((appointment) => appointment.status === "pending");
    if (pendingAppointment) {
      return {
        label: "Appointment needs action",
        title: pendingAppointment.employee_name,
        body: `${pendingAppointment.topic} · ${formatDateTime(pendingAppointment.preferred_date)}`,
        href: "/hbt/appointments",
        cta: "Review request",
        tone: "from-amber-500 to-orange-600",
      };
    }

    const incompleteLead = leadAssignments.find((lead) => Number(lead.progress_percent || 0) < 100);
    if (incompleteLead) {
      const nextTodo = incompleteLead.todos.find((todo) => Number(todo.is_completed) !== 1);
      return {
        label: "Next lead task",
        title: incompleteLead.employee_name,
        body: nextTodo ? nextTodo.label : "Continue moving this client forward.",
        href: "/hbt/employees",
        cta: "Open lead work",
        tone: "from-blue-600 to-cyan-600",
      };
    }

    return {
      label: "Workspace clear",
      title: "No urgent follow-up",
      body: "Your inbox, appointments, and lead tasks are quiet right now.",
      href: "/hbt/messages",
      cta: "Check messages",
      tone: "from-emerald-500 to-teal-600",
    };
  }, [appointments, leadAssignments, messageThreads]);

  const toggleTodo = async (assignment: LeadAssignment, todo: LeadTodo) => {
    try {
      setSavingTodoId(todo.id);
      const response = await fetch(`${API_BASE_URL}/lead-progress/assignments/${assignment.id}/todos/${todo.id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: Number(todo.is_completed) === 1 ? 0 : 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to update task.");
        return;
      }
      await loadDashboard();
      toast.success("Lead task updated.");
    } catch {
      toast.error("Failed to update task.");
    } finally {
      setSavingTodoId(null);
    }
  };

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20 md:p-7">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/30 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative grid gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-stretch">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur md:p-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Advisor workspace</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Good to see you, {user.full_name || "Advisor"}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 md:text-base">
                Your day at a glance: assigned clients, priority follow-ups, messages, appointments, and lead tasks.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                {[
                  ["Open leads", openLeads],
                  ["Pending appts", pendingAppointments],
                  ["Unread messages", unreadMessages],
                  ["Avg progress", `${averageProgress}%`],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <Link to={priorityAction.href} className={`group rounded-[1.5rem] bg-gradient-to-br ${priorityAction.tone} p-5 shadow-xl transition hover:-translate-y-1 md:p-6`}>
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/85">Today's priority</span>
                  <h2 className="mt-5 text-3xl font-black tracking-tight text-white">{priorityAction.label}</h2>
                  <p className="mt-3 text-xl font-black text-white">{priorityAction.title}</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/80">{priorityAction.body}</p>
                </div>
                <span className="w-fit rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg transition group-hover:bg-slate-100">
                  {priorityAction.cta} →
                </span>
              </div>
            </Link>
          </div>
        </section>

        {loading ? (
          <section className="premium-card p-8 text-center font-bold text-slate-500">Loading advisor workspace...</section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              {[
                ["Assigned clients", leadAssignments.length, "Active book of business", "text-violet-700"],
                ["Completed", completedLeads, "Clients fully moved through", "text-emerald-700"],
                ["Notifications", unreadNotifications, "Items waiting for review", "text-blue-700"],
                ["Quiz leads", submissions.length, "Readiness forms received", "text-amber-700"],
              ].map(([label, value, helper, color]) => (
                <div key={String(label)} className="metric-card">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <h2 className={`mt-2 text-3xl font-black ${color}`}>{value}</h2>
                  <p className="mt-2 text-xs font-bold text-slate-500">{helper}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="premium-card">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow">Client pipeline</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">My assigned clients</h2>
                    <p className="mt-1 text-sm text-slate-500">Work the lowest-progress leads first and keep tasks moving.</p>
                  </div>
                  <Link to="/hbt/employees" className="btn-secondary">View all employees</Link>
                </div>

                <div className="grid gap-4">
                  {activeLeads.map((assignment) => {
                    const completedTodos = assignment.todos.filter((todo) => Number(todo.is_completed) === 1).length;
                    const nextTodo = assignment.todos.find((todo) => Number(todo.is_completed) !== 1);

                    return (
                      <article key={assignment.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                        <div className="grid gap-4 lg:grid-cols-[1fr_190px] lg:items-center">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-violet-700 shadow-sm">
                                {initials(assignment.employee_name)}
                              </div>
                              <div className="min-w-0">
                                <h3 className="truncate text-xl font-black text-slate-950">{assignment.employee_name}</h3>
                                <p className="truncate text-sm font-semibold text-slate-500">{assignment.employee_email}</p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-violet-600">{assignment.employer_name} · /{assignment.partnership_slug}</p>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-400">
                                <span>Progress</span>
                                <span>{assignment.progress_percent}%</span>
                              </div>
                              <div className="h-3 rounded-full bg-white">
                                <div className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" style={{ width: `${assignment.progress_percent}%` }} />
                              </div>
                            </div>

                            <p className="mt-3 text-sm font-bold text-slate-700">
                              Next: <span className="text-violet-700">{nextTodo?.label || "Ready for completion review"}</span>
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Tasks</p>
                            <p className="mt-1 text-2xl font-black text-slate-950">{completedTodos}/{assignment.todos.length}</p>
                            <div className="mt-3 grid gap-2">
                              {assignment.todos.slice(0, 3).map((todo) => (
                                <button
                                  key={todo.id}
                                  disabled={savingTodoId === todo.id}
                                  onClick={() => toggleTodo(assignment, todo)}
                                  className={`rounded-xl px-3 py-2 text-left text-xs font-bold transition ${Number(todo.is_completed) === 1 ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700 hover:bg-violet-50 hover:text-violet-700"}`}
                                >
                                  <span className="mr-2">{Number(todo.is_completed) === 1 ? "✓" : "○"}</span>
                                  {todo.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {activeLeads.length === 0 && (
                    <div className="rounded-[1.5rem] bg-slate-50 p-8 text-center text-slate-500">No assigned clients yet.</div>
                  )}
                </div>
              </div>

              <aside className="grid gap-5">
                <div className="premium-card">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow">Schedule</p>
                      <h2 className="mt-1 text-xl font-black text-slate-950">Upcoming appointments</h2>
                    </div>
                    <Link to="/hbt/appointments" className="text-sm font-black text-violet-700">Open →</Link>
                  </div>

                  <div className="space-y-3">
                    {nextAppointments.map((appointment) => (
                      <Link key={appointment.id} to="/hbt/appointments" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-white hover:shadow-md">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-950">{formatTime(appointment.preferred_date)}</p>
                            <p className="mt-1 text-sm font-bold text-slate-700">{appointment.topic}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(appointment.status)}`}>{appointment.status}</span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-500">{appointment.employee_name} · {appointment.employer_name || "Employer"}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{formatDateTime(appointment.preferred_date)}</p>
                      </Link>
                    ))}
                    {nextAppointments.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No upcoming appointments.</p>}
                  </div>
                </div>

                <div className="premium-card">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow">Inbox</p>
                      <h2 className="mt-1 text-xl font-black text-slate-950">Recent messages</h2>
                    </div>
                    <Link to="/hbt/messages" className="text-sm font-black text-violet-700">Open →</Link>
                  </div>

                  <div className="space-y-3">
                    {latestMessages.map((thread) => (
                      <Link key={thread.id} to="/hbt/messages" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-violet-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-950">{thread.employee_name || thread.subject}</p>
                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{thread.company_name || thread.subject}</p>
                          </div>
                          {Number(thread.unread_count || 0) > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">{thread.unread_count}</span>}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{thread.last_message || "No message preview"}</p>
                        <p className="mt-2 text-xs font-bold text-slate-400">{formatDateTime(thread.last_message_at)}</p>
                      </Link>
                    ))}
                    {latestMessages.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No messages yet.</p>}
                  </div>
                </div>
              </aside>
            </section>

            <section className="premium-card">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Readiness signals</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">Recent quiz leads</h2>
                  <p className="mt-1 text-sm text-slate-500">Use quiz activity to prioritize warm follow-ups.</p>
                </div>
                <Link to="/hbt/quiz-submissions" className="btn-secondary">View submissions</Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {latestSubmissions.map((submission) => (
                  <Link key={submission.id} to="/hbt/quiz-submissions" className="rounded-3xl border border-slate-100 bg-slate-50 p-4 hover:bg-violet-50">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(submission.follow_up_status || "new")}`}>{submission.follow_up_status || "new"}</span>
                    <h3 className="mt-3 font-black text-slate-950">{submission.employee_name}</h3>
                    <p className="text-xs font-semibold text-slate-500">{submission.employee_email}</p>
                    <p className="mt-3 line-clamp-2 text-sm font-bold text-slate-700">{submission.quiz_title}</p>
                    <p className="mt-2 text-xs text-slate-500">{submission.company_name} · {formatDateTime(submission.submitted_at)}</p>
                  </Link>
                ))}
                {latestSubmissions.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 md:col-span-2 xl:col-span-5">No quiz leads yet.</p>}
              </div>
            </section>
          </>
        )}
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTMemberDashboard;
