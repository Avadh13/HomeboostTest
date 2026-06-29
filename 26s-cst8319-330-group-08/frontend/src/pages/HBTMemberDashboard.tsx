import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
import { useToast } from "../components/ToastProvider";

type Partnership = {
  id: number;
  employer_name: string;
  company_name?: string;
  slug?: string;
  status?: string;
};

type Employee = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  employer_name?: string;
};

type Appointment = {
  id: number;
  topic: string;
  preferred_date?: string | null;
  status: string;
  employee_name: string;
  employee_email: string;
  employer_name?: string | null;
  team_member_name?: string | null;
  meeting_link?: string | null;
};

type TeamMember = {
  id: number;
  full_name: string;
  title?: string;
  email?: string;
};

type AvailabilityRow = {
  team_member_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: number | boolean;
};

type QuizSubmission = {
  id: number;
  quiz_title: string;
  employee_name: string;
  employee_email: string;
  company_name: string;
  submitted_at: string;
  follow_up_status?: string;
  answers?: {
    question_text: string;
    answer_text: string;
  }[];
};

type MessageThread = {
  id: number;
  subject: string;
  employee_name?: string;
  company_name?: string;
  assigned_member_name?: string;
  status: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toTime = (value?: string) => (value ? value.slice(0, 5) : "--:--");

function HBTMemberDashboard() {
  const toast = useToast();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<QuizSubmission | null>(null);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [partnershipRes, usersRes, quizRes, appointmentRes, notificationRes, availabilityRes, messageRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin-partnerships`, { headers }),
        fetch(`${API_BASE_URL}/users`, { headers }),
        fetch(`${API_BASE_URL}/quizzes/submissions`, { headers }),
        fetch(`${API_BASE_URL}/appointments/hbt`, { headers }),
        fetch(`${API_BASE_URL}/notifications/unread-count`, { headers }),
        fetch(`${API_BASE_URL}/advisor-availability`, { headers }),
        fetch(`${API_BASE_URL}/messages/threads`, { headers }),
      ]);

      const partnershipData = await partnershipRes.json();
      const usersData = await usersRes.json();
      const quizData = await quizRes.json();
      const appointmentData = await appointmentRes.json();
      const notificationData = await notificationRes.json();
      const availabilityData = await availabilityRes.json();
      const messageData = await messageRes.json();

      setPartnerships(Array.isArray(partnershipData) ? partnershipData : []);
      setEmployees(Array.isArray(usersData) ? usersData.filter((item: Employee) => item.role === "employee") : []);
      setSubmissions(Array.isArray(quizData) ? quizData : []);
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
      setUnreadNotifications(Number(notificationData.unread_count || 0));
      setTeamMembers(Array.isArray(availabilityData.team_members) ? availabilityData.team_members : []);
      setAvailability(Array.isArray(availabilityData.availability) ? availabilityData.availability : []);
      setMessageThreads(Array.isArray(messageData) ? messageData : []);
    } catch (error) {
      console.error("Failed to load HBT member dashboard:", error);
      toast.error("Failed to load HBT member dashboard.");
      setPartnerships([]);
      setEmployees([]);
      setSubmissions([]);
      setAppointments([]);
      setMessageThreads([]);
      setTeamMembers([]);
      setAvailability([]);
      setUnreadNotifications(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const pendingAppointments = appointments.filter((item) => item.status === "pending").length;
  const approvedAppointments = appointments.filter((item) => item.status === "approved").length;
  const completedAppointments = appointments.filter((item) => item.status === "completed").length;
  const newLeads = submissions.filter((item) => !item.follow_up_status || item.follow_up_status === "new").length;
  const completed = submissions.filter((item) => item.follow_up_status === "completed").length;
  const unreadMessages = messageThreads.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);
  const openThreads = messageThreads.filter((item) => item.status === "open").length;

  const latestAppointments = useMemo(() => appointments.slice(0, 4), [appointments]);
  const latestEmployees = useMemo(() => employees.slice(0, 6), [employees]);
  const latestSubmissions = useMemo(() => submissions.slice(0, 6), [submissions]);
  const latestMessages = useMemo(() => messageThreads.slice(0, 5), [messageThreads]);

  const workTimePreview = useMemo(() => {
    return teamMembers.slice(0, 4).map((member) => {
      const rows = availability
        .filter((row) => Number(row.team_member_id) === Number(member.id) && Boolean(row.is_available))
        .sort((a, b) => Number(a.day_of_week) - Number(b.day_of_week));
      const first = rows[0];
      const last = rows[rows.length - 1];

      return {
        member,
        label: first && last ? `${dayNames[first.day_of_week]}-${dayNames[last.day_of_week]} · ${toTime(first.start_time)}-${toTime(first.end_time)}` : "No work hours set",
      };
    });
  }, [availability, teamMembers]);

  const updateFollowUpStatus = async (submissionId: number, followUpStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/submissions/${submissionId}/follow-up-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ follow_up_status: followUpStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to update follow-up status.");
        return;
      }

      setSubmissions((prev) => prev.map((item) => (item.id === submissionId ? { ...item, follow_up_status: followUpStatus } : item)));
      toast.success("Follow-up status updated.");
    } catch {
      toast.error("Failed to update follow-up status.");
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
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">
                View client messages, notifications, appointments, employee leads, work-time availability, and follow-up work from one advisor dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/hbt/messages" className="relative rounded-full bg-white px-4 py-2 text-sm font-black text-violet-800 hover:bg-violet-50">
                Messages
                {unreadMessages > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">{unreadMessages}</span>}
              </Link>
              <Link to="/notifications" className="relative rounded-full border border-white/30 px-4 py-2 text-sm font-black text-white hover:bg-white/10">
                Notifications
                {unreadNotifications > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">{unreadNotifications}</span>}
              </Link>
              <button onClick={logout} className="rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700">Logout</button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/hbt/messages" className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700">Open Message Center</Link>
            <Link to="/hbt/appointments" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-blue-950 hover:bg-blue-50">View Appointments</Link>
            <Link to="/hbt/availability" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Work Time</Link>
            <Link to="/hbt/quiz-submissions" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">View Quiz Leads</Link>
          </div>
        </header>

        {loading ? (
          <section className="premium-card p-8 text-center font-bold text-slate-500">Loading member dashboard...</section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
              {[
                ["Messages", unreadMessages, "text-red-600"],
                ["Notifications", unreadNotifications, "text-blue-600"],
                ["Companies", partnerships.length, "text-slate-950"],
                ["Employees", employees.length, "text-slate-950"],
                ["Pending Appts", pendingAppointments, "text-amber-600"],
                ["New Quiz Leads", newLeads, "text-yellow-600"],
                ["Completed", completed, "text-green-600"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="metric-card">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <h2 className={`mt-2 text-3xl font-black ${color}`}>{value}</h2>
                </div>
              ))}
            </section>

            <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="premium-card">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow">Communication</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">Client message inbox</h2>
                    <p className="mt-1 text-sm text-slate-500">Employees can message advisors here through Communication Center.</p>
                  </div>
                  <Link to="/hbt/messages" className="btn-primary">Open Messages</Link>
                </div>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-red-50 p-4 text-center"><p className="text-3xl font-black text-red-700">{unreadMessages}</p><p className="text-xs font-black uppercase text-red-700">Unread</p></div>
                  <div className="rounded-2xl bg-blue-50 p-4 text-center"><p className="text-3xl font-black text-blue-700">{openThreads}</p><p className="text-xs font-black uppercase text-blue-700">Open</p></div>
                  <div className="rounded-2xl bg-violet-50 p-4 text-center"><p className="text-3xl font-black text-violet-700">{messageThreads.length}</p><p className="text-xs font-black uppercase text-violet-700">Threads</p></div>
                </div>
                <div className="space-y-3">
                  {latestMessages.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No client messages yet.</p>
                  ) : (
                    latestMessages.map((thread) => (
                      <Link key={thread.id} to="/hbt/messages" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-violet-50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-950">{thread.subject}</p>
                            <p className="mt-1 text-sm text-slate-500">{thread.employee_name || "Employee"}{thread.company_name ? ` · ${thread.company_name}` : ""}</p>
                          </div>
                          {Number(thread.unread_count || 0) > 0 && <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">{thread.unread_count}</span>}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{thread.last_message || "No message preview"}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="premium-card">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow">Appointment Time</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">Meeting queue</h2>
                  </div>
                  <Link to="/hbt/appointments" className="btn-dark">Manage Appointments</Link>
                </div>
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-amber-50 p-4 text-center"><p className="text-3xl font-black text-amber-700">{pendingAppointments}</p><p className="text-xs font-black uppercase text-amber-700">Pending</p></div>
                  <div className="rounded-2xl bg-blue-50 p-4 text-center"><p className="text-3xl font-black text-blue-700">{approvedAppointments}</p><p className="text-xs font-black uppercase text-blue-700">Approved</p></div>
                  <div className="rounded-2xl bg-emerald-50 p-4 text-center"><p className="text-3xl font-black text-emerald-700">{completedAppointments}</p><p className="text-xs font-black uppercase text-emerald-700">Done</p></div>
                </div>
                <div className="space-y-3">
                  {latestAppointments.map((appointment) => (
                    <div key={appointment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">{appointment.topic}</p>
                          <p className="text-sm text-slate-500">{appointment.employee_name} · {appointment.employee_email}</p>
                          <p className="text-xs text-purple-700">{appointment.employer_name || "Company N/A"}</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">{appointment.status}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600"><strong>Preferred:</strong> {appointment.preferred_date ? new Date(appointment.preferred_date).toLocaleString() : "Not specified"}</p>
                    </div>
                  ))}
                  {latestAppointments.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No appointment requests found.</p>}
                </div>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="premium-card">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow">Work Time</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">Advisor work hours</h2>
                  </div>
                  <Link to="/hbt/availability" className="btn-secondary">Manage Work Time</Link>
                </div>
                <div className="space-y-3">
                  {workTimePreview.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">No advisor work time configured yet.</p>
                  ) : (
                    workTimePreview.map((item) => (
                      <div key={item.member.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="font-black text-slate-950">{item.member.full_name}</p>
                        <p className="text-sm text-slate-500">{item.member.title || "Advisor"}</p>
                        <p className="mt-2 font-bold text-blue-700">{item.label}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="premium-card">
                <h2 className="text-2xl font-black text-slate-950">Recent Employee Leads</h2>
                <div className="mt-5 space-y-3">
                  {latestEmployees.map((employee) => (
                    <div key={employee.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center">
                      <div>
                        <p className="font-bold text-slate-950">{employee.full_name}</p>
                        <p className="text-sm text-slate-500">{employee.email}</p>
                        <p className="text-xs text-purple-700">{employee.employer_name || "Company N/A"}</p>
                      </div>
                      <Link to="/hbt/messages" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Message</Link>
                    </div>
                  ))}
                  {latestEmployees.length === 0 && <p className="text-slate-500">No employee leads found.</p>}
                </div>
              </div>
            </section>

            <section className="premium-card overflow-hidden p-0">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-2xl font-black text-slate-950">Assigned Quiz Submissions</h2>
                <p className="mt-1 text-sm text-slate-500">These quiz leads belong to employees under your assigned HBT team.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-600">
                      <th className="p-3">Quiz</th>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Submitted</th>
                      <th className="p-3">Follow-Up</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestSubmissions.map((submission) => (
                      <tr key={submission.id} className="border-b last:border-0">
                        <td className="p-3 font-semibold">{submission.quiz_title}</td>
                        <td className="p-3"><p>{submission.employee_name}</p><p className="text-xs text-slate-500">{submission.employee_email}</p></td>
                        <td className="p-3">{submission.company_name || "N/A"}</td>
                        <td className="p-3">{submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "-"}</td>
                        <td className="p-3">
                          <select className="rounded-lg border p-2" value={submission.follow_up_status || "new"} onChange={(e) => updateFollowUpStatus(submission.id, e.target.value)}>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="not_interested">Not Interested</option>
                          </select>
                        </td>
                        <td className="p-3"><button onClick={() => setSelectedSubmission(submission)} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white">View Answers</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {latestSubmissions.length === 0 && <p className="p-5 text-slate-500">No quiz submissions found.</p>}
              </div>
            </section>
          </>
        )}
      </div>

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Quiz Answers</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">{selectedSubmission.employee_name}</h2>
                <p className="text-sm text-slate-500">{selectedSubmission.employee_email}</p>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="space-y-3">
              {(selectedSubmission.answers || []).map((answer, index) => (
                <div key={`${answer.question_text}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-slate-950">{answer.question_text}</p>
                  <p className="mt-2 text-slate-700">{answer.answer_text || "No answer"}</p>
                </div>
              ))}
              {(!selectedSubmission.answers || selectedSubmission.answers.length === 0) && <p className="text-slate-500">No detailed answers available.</p>}
            </div>
          </div>
        </div>
      )}

      <ChatWidget />
    </main>
  );
}

export default HBTMemberDashboard;
