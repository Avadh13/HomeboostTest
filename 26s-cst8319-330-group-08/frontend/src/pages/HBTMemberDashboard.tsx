import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
import HBTTaskScheduler from "../components/HBTTaskScheduler";
import { useToast } from "../components/ToastProvider";

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

type LeadFilter = "open" | "attention" | "completed" | "all";
type SignalFilter = "all" | "new" | "pending" | "completed";

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not available";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

const getLeadAttentionScore = (lead: LeadAssignment) => {
  const progress = Number(lead.progress_percent || 0);
  const openTodos = lead.todos.filter((todo) => Number(todo.is_completed) !== 1).length;
  return openTodos * 100 + (100 - progress);
};

const matchesSignalFilter = (submission: QuizSubmission, filter: SignalFilter) => {
  const status = (submission.follow_up_status || "new").toLowerCase();
  if (filter === "all") return true;
  if (filter === "new") return status === "new";
  if (filter === "pending") return status.includes("pending") || status.includes("review") || status.includes("follow");
  return status.includes("complete") || status.includes("closed");
};

function HBTMemberDashboard() {
  const toast = useToast();
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
  const [leadAssignments, setLeadAssignments] = useState<LeadAssignment[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingTodoId, setSavingTodoId] = useState<number | null>(null);
  const [leadQuery, setLeadQuery] = useState("");
  const [leadFilter, setLeadFilter] = useState<LeadFilter>("open");
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [quizRes, notificationRes, messageRes, leadRes] = await Promise.all([
        fetch(`${API_BASE_URL}/quizzes/submissions`, { headers }),
        fetch(`${API_BASE_URL}/notifications/unread-count`, { headers }),
        fetch(`${API_BASE_URL}/messages/threads`, { headers }),
        fetch(`${API_BASE_URL}/lead-progress/hbt`, { headers }),
      ]);

      const quizData = await quizRes.json();
      const notificationData = await notificationRes.json();
      const messageData = await messageRes.json();
      const leadData = await leadRes.json();

      setSubmissions(Array.isArray(quizData) ? quizData : []);
      setUnreadNotifications(Number(notificationData.unread_count || 0));
      setMessageThreads(Array.isArray(messageData) ? messageData : []);
      setLeadAssignments(Array.isArray(leadData.assignments) ? leadData.assignments : []);
    } catch (error) {
      console.error("Failed to load HBT member dashboard:", error);
      toast.error("Failed to load HBT member dashboard.");
      setSubmissions([]);
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
  const openLeads = leadAssignments.filter((item) => Number(item.progress_percent || 0) < 100).length;
  const completedLeads = leadAssignments.filter((item) => Number(item.progress_percent || 0) >= 100).length;
  const averageProgress = leadAssignments.length
    ? Math.round(leadAssignments.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / leadAssignments.length)
    : 0;

  const filteredLeads = useMemo(() => {
    const query = leadQuery.trim().toLowerCase();

    return [...leadAssignments]
      .filter((lead) => {
        const progress = Number(lead.progress_percent || 0);
        const hasOpenTodo = lead.todos.some((todo) => Number(todo.is_completed) !== 1);
        const matchesFilter =
          leadFilter === "all" ||
          (leadFilter === "open" && progress < 100) ||
          (leadFilter === "attention" && progress < 75 && hasOpenTodo) ||
          (leadFilter === "completed" && progress >= 100);

        const searchText = [lead.employee_name, lead.employee_email, lead.employer_name, lead.partnership_slug]
          .join(" ")
          .toLowerCase();

        return matchesFilter && (!query || searchText.includes(query));
      })
      .sort((a, b) => getLeadAttentionScore(b) - getLeadAttentionScore(a));
  }, [leadAssignments, leadFilter, leadQuery]);

  const filteredSubmissions = useMemo(() => {
    return [...submissions]
      .filter((submission) => matchesSignalFilter(submission, signalFilter))
      .sort((a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime());
  }, [signalFilter, submissions]);

  const priorityAction: PriorityAction = useMemo(() => {
    const unreadThread = messageThreads.find((thread) => Number(thread.unread_count || 0) > 0);
    if (unreadThread) {
      return {
        label: "Reply first",
        title: unreadThread.employee_name || unreadThread.subject,
        body: unreadThread.last_message || "A client is waiting for your response.",
        href: "/hbt/messages",
        cta: "Open messages",
        tone: "from-indigo-600 to-violet-700",
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

    const newSubmission = submissions.find((submission) => (submission.follow_up_status || "new") === "new");
    if (newSubmission) {
      return {
        label: "Review quiz signal",
        title: newSubmission.employee_name,
        body: `${newSubmission.quiz_title} · ${formatDateTime(newSubmission.submitted_at)}`,
        href: "/hbt/quiz-submissions",
        cta: "Review signal",
        tone: "from-amber-500 to-orange-600",
      };
    }

    return {
      label: "Workspace clear",
      title: "No urgent follow-up",
      body: "Your messages, lead tasks, and quiz signals are quiet right now.",
      href: "/hbt/messages",
      cta: "Check messages",
      tone: "from-emerald-500 to-teal-600",
    };
  }, [leadAssignments, messageThreads, submissions]);

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
                Manage assigned clients, scheduled tasks, follow-up signals, and message-based support from one focused workspace.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                {[
                  ["Open leads", openLeads],
                  ["Unread messages", unreadMessages],
                  ["Unread alerts", unreadNotifications],
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
                ["Assigned clients", leadAssignments.length, "Search and task-manage", "text-violet-700"],
                ["Completed leads", completedLeads, "Clients fully moved through", "text-emerald-700"],
                ["Unread messages", unreadMessages, "Needs response", "text-blue-700"],
                ["Quiz signals", filteredSubmissions.length, "Filtered readiness leads", "text-amber-700"],
              ].map(([label, value, helper, color]) => (
                <div key={String(label)} className="metric-card">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <h2 className={`mt-2 text-3xl font-black ${color}`}>{value}</h2>
                  <p className="mt-2 text-xs font-bold text-slate-500">{helper}</p>
                </div>
              ))}
            </section>

            <HBTTaskScheduler />

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
              <div className="premium-card">
                <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <p className="eyebrow">Client pipeline</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">My assigned clients</h2>
                    <p className="mt-1 text-sm text-slate-500">Search, filter, and update tasks without losing the full employee list.</p>
                  </div>
                  <Link to="/hbt/employees" className="btn-secondary">Full employee manager</Link>
                </div>

                <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                  <input
                    className="form-field"
                    value={leadQuery}
                    onChange={(event) => setLeadQuery(event.target.value)}
                    placeholder="Search client, email, company, or portal slug..."
                  />
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["open", "Open"],
                      ["attention", "Needs action"],
                      ["completed", "Completed"],
                      ["all", "All"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setLeadFilter(value as LeadFilter)}
                        className={`rounded-full px-3 py-2 text-xs font-black transition ${leadFilter === value ? "bg-violet-700 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-400">
                  <span>{filteredLeads.length} clients showing</span>
                  <span>{leadAssignments.length} total assigned</span>
                </div>

                <div className="grid max-h-[780px] gap-3 overflow-y-auto pr-1">
                  {filteredLeads.map((assignment) => {
                    const completedTodos = assignment.todos.filter((todo) => Number(todo.is_completed) === 1).length;
                    const nextTodo = assignment.todos.find((todo) => Number(todo.is_completed) !== 1);
                    const progress = Number(assignment.progress_percent || 0);

                    return (
                      <article key={assignment.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                        <div className="grid gap-4 lg:grid-cols-[1fr_210px] lg:items-center">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-violet-700 shadow-sm">
                                {initials(assignment.employee_name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-xl font-black text-slate-950">{assignment.employee_name}</h3>
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${progress >= 100 ? "bg-emerald-100 text-emerald-700" : progress < 50 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                    {progress >= 100 ? "Complete" : progress < 50 ? "Needs action" : "Active"}
                                  </span>
                                </div>
                                <p className="truncate text-sm font-semibold text-slate-500">{assignment.employee_email}</p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-violet-600">{assignment.employer_name} · /{assignment.partnership_slug}</p>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-400">
                                <span>Progress</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="h-3 rounded-full bg-white">
                                <div className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" style={{ width: `${progress}%` }} />
                              </div>
                            </div>

                            <p className="mt-3 text-sm font-bold text-slate-700">
                              Next: <span className="text-violet-700">{nextTodo?.label || "Ready for completion review"}</span>
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <div className="flex items-end justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Tasks</p>
                                <p className="mt-1 text-2xl font-black text-slate-950">{completedTodos}/{assignment.todos.length}</p>
                              </div>
                              <Link to="/hbt/messages" className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-violet-700">Message</Link>
                            </div>
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

                  {filteredLeads.length === 0 && (
                    <div className="rounded-[1.5rem] bg-slate-50 p-8 text-center text-slate-500">No clients match this filter.</div>
                  )}
                </div>
              </div>

              <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
                <div className="premium-card">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow">Readiness queue</p>
                      <h2 className="mt-1 text-xl font-black text-slate-950">Quiz follow-ups</h2>
                      <p className="mt-1 text-xs font-bold text-slate-500">Review signals without scrolling the full dashboard.</p>
                    </div>
                    <Link to="/hbt/quiz-submissions" className="text-sm font-black text-violet-700">All →</Link>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    {[
                      ["all", "All"],
                      ["new", "New"],
                      ["pending", "Pending"],
                      ["completed", "Done"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setSignalFilter(value as SignalFilter)}
                        className={`rounded-full px-3 py-1.5 text-xs font-black transition ${signalFilter === value ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                    {filteredSubmissions.map((submission) => (
                      <Link key={submission.id} to="/hbt/quiz-submissions" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-violet-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-black text-slate-950">{submission.employee_name}</h3>
                            <p className="truncate text-xs font-semibold text-slate-500">{submission.employee_email}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusClass(submission.follow_up_status || "new")}`}>{submission.follow_up_status || "new"}</span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-bold text-slate-700">{submission.quiz_title}</p>
                        <p className="mt-2 text-xs text-slate-500">{submission.company_name} · {formatDateTime(submission.submitted_at)}</p>
                      </Link>
                    ))}
                    {filteredSubmissions.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No quiz leads for this filter.</p>}
                  </div>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTMemberDashboard;