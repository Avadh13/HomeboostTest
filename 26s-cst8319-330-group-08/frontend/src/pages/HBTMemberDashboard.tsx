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

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const statusClass = (status?: string) => {
  if (status === "completed" || status === "approved" || status === "closed") return "bg-emerald-100 text-emerald-700";
  if (status === "pending" || status === "new") return "bg-amber-100 text-amber-700";
  if (status === "cancelled" || status === "not_interested") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
};

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

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

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
  const newLeads = leadAssignments.filter((item) => Number(item.progress_percent || 0) === 0).length;
  const completedLeads = leadAssignments.filter((item) => Number(item.progress_percent || 0) >= 100).length;
  const averageProgress = leadAssignments.length ? Math.round(leadAssignments.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / leadAssignments.length) : 0;
  const latestSubmissions = submissions.slice(0, 6);
  const latestAppointments = appointments.slice(0, 6);
  const latestMessages = messageThreads.slice(0, 5);

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
    } catch {
      toast.error("Failed to update task.");
    } finally {
      setSavingTodoId(null);
    }
  };

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="theme-panel">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">HBT Member Workspace</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Welcome, {user.full_name || "Team Member"}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">Your assigned employee leads, todo progress, messages, appointments, and quiz follow-up overview.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/hbt/messages" className="relative rounded-full bg-white px-4 py-2 text-sm font-black text-violet-800 hover:bg-violet-50">Messages{unreadMessages > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">{unreadMessages}</span>}</Link>
              <Link to="/notifications" className="relative rounded-full border border-white/30 px-4 py-2 text-sm font-black text-white hover:bg-white/10">Notifications{unreadNotifications > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">{unreadNotifications}</span>}</Link>
              <button onClick={logout} className="rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700">Logout</button>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3"><Link to="/hbt/messages" className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700">Open Message Center</Link><Link to="/hbt/appointments" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-blue-950 hover:bg-blue-50">View Appointments</Link><Link to="/hbt/quiz-submissions" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Quiz Leads</Link></div>
        </header>

        {loading ? (
          <section className="premium-card p-8 text-center font-bold text-slate-500">Loading member dashboard...</section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
              {[["Assigned Leads", leadAssignments.length, "text-violet-700"], ["Avg Progress", `${averageProgress}%`, "text-emerald-700"], ["New Leads", newLeads, "text-amber-700"], ["Completed", completedLeads, "text-green-700"], ["Messages", unreadMessages, "text-red-600"], ["Notifications", unreadNotifications, "text-blue-600"], ["Pending Appts", pendingAppointments, "text-amber-600"]].map(([label, value, color]) => <div key={String(label)} className="metric-card"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><h2 className={`mt-2 text-3xl font-black ${color}`}>{value}</h2></div>)}
            </section>

            <section className="premium-card">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Assigned work review</p><h2 className="mt-1 text-2xl font-black text-slate-950">My employee lead overview</h2><p className="mt-1 text-sm text-slate-500">Update todo tasks. Progress appears for HBT admin and the employee/client portal.</p></div><Link to="/hbt/employees" className="btn-secondary">All employees</Link></div>
              <div className="grid gap-4 xl:grid-cols-2">
                {leadAssignments.map((assignment) => (
                  <article key={assignment.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-xl font-black text-slate-950">{assignment.employee_name}</h3><p className="text-sm font-semibold text-slate-500">{assignment.employee_email}</p><p className="mt-1 text-xs font-black uppercase tracking-wide text-violet-600">{assignment.employer_name} · /{assignment.partnership_slug}</p></div><span className="text-3xl font-black text-violet-700">{assignment.progress_percent}%</span></div>
                    <div className="mt-4 h-3 rounded-full bg-white"><div className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" style={{ width: `${assignment.progress_percent}%` }} /></div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {assignment.todos.map((todo) => <button key={todo.id} disabled={savingTodoId === todo.id} onClick={() => toggleTodo(assignment, todo)} className={`rounded-2xl border p-3 text-left text-sm font-bold transition ${Number(todo.is_completed) === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50"}`}><span className="mr-2">{Number(todo.is_completed) === 1 ? "✅" : "⬜"}</span>{todo.label}</button>)}
                    </div>
                  </article>
                ))}
                {leadAssignments.length === 0 && <p className="rounded-3xl bg-slate-50 p-8 text-center text-slate-500 xl:col-span-2">No employees assigned to you yet.</p>}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="premium-card"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Communication</p><h2 className="mt-1 text-2xl font-black text-slate-950">Client message inbox</h2></div><Link to="/hbt/messages" className="btn-primary">Open Messages</Link></div><div className="space-y-3">{latestMessages.map((thread) => <Link key={thread.id} to="/hbt/messages" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-violet-50"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{thread.subject}</p><p className="mt-1 text-sm text-slate-500">{thread.employee_name || "Employee"}{thread.company_name ? ` · ${thread.company_name}` : ""}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(thread.status)}`}>{thread.status}</span></div><p className="mt-2 line-clamp-2 text-sm text-slate-600">{thread.last_message || "No message preview"}</p><p className="mt-2 text-xs font-bold text-slate-400">{formatDate(thread.last_message_at)}</p></Link>)}{latestMessages.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No client messages yet.</p>}</div></div>
              <div className="premium-card"><div className="mb-5"><p className="eyebrow">Appointments</p><h2 className="mt-1 text-2xl font-black text-slate-950">Upcoming work</h2></div><div className="space-y-3">{latestAppointments.map((appointment) => <div key={appointment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{appointment.topic}</p><p className="text-sm text-slate-500">{appointment.employee_name} · {appointment.employer_name || "Employer"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(appointment.status)}`}>{appointment.status}</span></div><p className="mt-2 text-xs font-bold text-slate-400">{formatDate(appointment.preferred_date)}</p></div>)}{latestAppointments.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No appointments yet.</p>}</div></div>
            </section>

            <section className="premium-card"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Assigned quiz leads</p><h2 className="mt-1 text-2xl font-black text-slate-950">Recent quiz submissions</h2></div><Link to="/hbt/quiz-submissions" className="btn-secondary">View all</Link></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{latestSubmissions.map((submission) => <button key={submission.id} onClick={() => undefined} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-left hover:bg-violet-50"><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(submission.follow_up_status || "new")}`}>{submission.follow_up_status || "new"}</span><h3 className="mt-3 font-black text-slate-950">{submission.employee_name}</h3><p className="text-xs font-semibold text-slate-500">{submission.employee_email}</p><p className="mt-3 text-sm font-bold text-slate-700">{submission.quiz_title}</p><p className="mt-1 text-xs text-slate-500">{submission.company_name} · {formatDate(submission.submitted_at)}</p></button>)}{latestSubmissions.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 md:col-span-2 xl:col-span-3">No quiz leads yet.</p>}</div></section>
          </>
        )}
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTMemberDashboard;
