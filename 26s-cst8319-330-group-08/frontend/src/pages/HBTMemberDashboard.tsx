import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";

type Partnership = {
  id: number;
  employer_name: string;
  company_name?: string;
  hbt_name?: string;
  team_name?: string;
  slug?: string;
  status?: string;
};

type Employee = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: number;
  employer_name?: string;
  hbt_name?: string;
  partnership_slug?: string;
};

type Appointment = {
  id: number;
  topic: string;
  preferred_date?: string | null;
  status: string;
  employee_name: string;
  employee_email: string;
  employer_name?: string | null;
  partnership_slug?: string | null;
  team_member_name?: string | null;
  meeting_link?: string | null;
};

type QuizSubmission = {
  id: number;
  quiz_title: string;
  employee_name: string;
  employee_email: string;
  company_name: string;
  team_name: string;
  submitted_at: string;
  follow_up_status?: string;
  answers?: {
    question_text: string;
    answer_text: string;
  }[];
};

function HBTMemberDashboard() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] =
    useState<QuizSubmission | null>(null);

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

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [partnershipRes, usersRes, quizRes, appointmentRes, notificationRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin-partnerships`, { headers }),
        fetch(`${API_BASE_URL}/users`, { headers }),
        fetch(`${API_BASE_URL}/quizzes/submissions`, { headers }),
        fetch(`${API_BASE_URL}/appointments/hbt`, { headers }),
        fetch(`${API_BASE_URL}/notifications/unread-count`, { headers }),
      ]);

      const partnershipData = await partnershipRes.json();
      const usersData = await usersRes.json();
      const quizData = await quizRes.json();
      const appointmentData = await appointmentRes.json();
      const notificationData = await notificationRes.json();

      setPartnerships(Array.isArray(partnershipData) ? partnershipData : []);

      const employeeUsers = Array.isArray(usersData)
        ? usersData.filter((item: Employee) => item.role === "employee")
        : [];

      setEmployees(employeeUsers);
      setSubmissions(Array.isArray(quizData) ? quizData : []);
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
      setUnreadNotifications(Number(notificationData.unread_count || 0));
    } catch (error) {
      console.error("Failed to load HBT member dashboard:", error);
      setPartnerships([]);
      setEmployees([]);
      setSubmissions([]);
      setAppointments([]);
      setUnreadNotifications(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const newLeads = submissions.filter(
    (item) => !item.follow_up_status || item.follow_up_status === "new"
  ).length;

  const inProgress = submissions.filter(
    (item) =>
      item.follow_up_status === "contacted" ||
      item.follow_up_status === "in_progress"
  ).length;

  const completed = submissions.filter(
    (item) => item.follow_up_status === "completed"
  ).length;

  const pendingAppointments = appointments.filter(
    (item) => item.status === "pending"
  ).length;

  const latestAppointments = useMemo(() => {
    return appointments.slice(0, 4);
  }, [appointments]);

  const latestSubmissions = useMemo(() => {
    return submissions.slice(0, 6);
  }, [submissions]);

  const latestEmployees = useMemo(() => {
    return employees.slice(0, 6);
  }, [employees]);

  const updateFollowUpStatus = async (
    submissionId: number,
    followUpStatus: string
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/quizzes/submissions/${submissionId}/follow-up-status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ follow_up_status: followUpStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to update follow-up status");
        return;
      }

      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === submissionId
            ? { ...item, follow_up_status: followUpStatus }
            : item
        )
      );
    } catch {
      alert("Failed to update follow-up status");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/hbt/member-dashboard" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 font-black text-white shadow-lg shadow-blue-500/30">
              HB
            </span>

            <div>
              <p className="text-2xl font-black text-slate-950">HomeBoost</p>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                HBT Member Portal
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-bold text-slate-950">
                {user.full_name || "HBT Member"}
              </p>
              <p className="text-xs font-bold uppercase text-slate-500">
                HBT Member
              </p>
            </div>

            <Link
              to="/notifications"
              className="relative rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Notifications
              {unreadNotifications > 0 && (
                <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">
                  {unreadNotifications}
                </span>
              )}
            </Link>

            <button
              onClick={logout}
              className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl bg-gradient-to-r from-slate-950 to-blue-950 p-8 text-white shadow-xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
              HBT Member Workspace
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Welcome, {user.full_name || "Team Member"}
            </h1>

            <p className="mt-3 max-w-3xl text-blue-100">
              View your assigned client companies, employee leads, appointment
              requests, quiz submissions, and follow-up work.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/hbt/appointments"
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-blue-950 hover:bg-blue-50"
              >
                View Appointments
              </Link>

              <Link
                to="/hbt/quiz-submissions"
                className="rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                View Quiz Leads
              </Link>

              <a
                href={`mailto:${user.email || ""}`}
                className="rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                My Email
              </a>
            </div>
          </section>

          {loading ? (
            <section className="rounded-2xl bg-white p-6 shadow">
              <p className="text-slate-600">Loading member dashboard...</p>
            </section>
          ) : (
            <>
              <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-2xl bg-white p-6 shadow">
                  <p className="text-sm font-semibold text-slate-500">
                    Assigned Companies
                  </p>
                  <h2 className="mt-2 text-5xl font-black text-slate-950">
                    {partnerships.length}
                  </h2>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow">
                  <p className="text-sm font-semibold text-slate-500">
                    Employees
                  </p>
                  <h2 className="mt-2 text-5xl font-black text-slate-950">
                    {employees.length}
                  </h2>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow">
                  <p className="text-sm font-semibold text-slate-500">
                    Pending Appointments
                  </p>
                  <h2 className="mt-2 text-5xl font-black text-blue-600">
                    {pendingAppointments}
                  </h2>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow">
                  <p className="text-sm font-semibold text-slate-500">
                    New Quiz Leads
                  </p>
                  <h2 className="mt-2 text-5xl font-black text-yellow-600">
                    {newLeads}
                  </h2>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow">
                  <p className="text-sm font-semibold text-slate-500">
                    In Progress
                  </p>
                  <h2 className="mt-2 text-5xl font-black text-blue-600">
                    {inProgress}
                  </h2>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow">
                  <p className="text-sm font-semibold text-slate-500">
                    Completed
                  </p>
                  <h2 className="mt-2 text-5xl font-black text-green-600">
                    {completed}
                  </h2>
                </div>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">
                      Appointment Requests
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      These appointment requests belong to employees under your assigned HBT team.
                    </p>
                  </div>

                  <Link
                    to="/hbt/appointments"
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    Manage Appointments
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {latestAppointments.map((appointment) => (
                    <div key={appointment.id} className="rounded-2xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">
                            {appointment.topic}
                          </p>
                          <p className="text-sm text-slate-500">
                            {appointment.employee_name} · {appointment.employee_email}
                          </p>
                          <p className="text-xs text-purple-700">
                            {appointment.employer_name || "Company N/A"}
                          </p>
                        </div>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
                          {appointment.status}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-600">
                        <strong>Preferred:</strong>{" "}
                        {appointment.preferred_date
                          ? new Date(appointment.preferred_date).toLocaleString()
                          : "Not specified"}
                      </p>

                      {appointment.meeting_link && (
                        <a
                          href={appointment.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white"
                        >
                          Open Meeting Link
                        </a>
                      )}
                    </div>
                  ))}

                  {latestAppointments.length === 0 && (
                    <p className="text-slate-500">No appointment requests found.</p>
                  )}
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl bg-white p-6 shadow">
                  <h2 className="text-2xl font-black text-slate-950">
                    Assigned Client Companies
                  </h2>

                  <div className="mt-5 space-y-3">
                    {partnerships.map((item) => (
                      <div key={item.id} className="rounded-2xl border p-4">
                        <p className="font-bold text-slate-950">
                          {item.employer_name || item.company_name || "Company"}
                        </p>

                        <p className="text-sm text-slate-500">
                          Portal: /{item.slug || "no-slug"}
                        </p>

                        <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          {item.status || "active"}
                        </span>
                      </div>
                    ))}

                    {partnerships.length === 0 && (
                      <p className="text-slate-500">
                        No assigned companies found.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow">
                  <h2 className="text-2xl font-black text-slate-950">
                    Recent Employee Leads
                  </h2>

                  <div className="mt-5 space-y-3">
                    {latestEmployees.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex flex-col justify-between gap-3 rounded-2xl border p-4 md:flex-row md:items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-950">
                            {employee.full_name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {employee.email}
                          </p>
                          <p className="text-xs text-purple-700">
                            {employee.employer_name || "Company N/A"}
                          </p>
                        </div>

                        <a
                          href={`mailto:${employee.email}`}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          Email
                        </a>
                      </div>
                    ))}

                    {latestEmployees.length === 0 && (
                      <p className="text-slate-500">No employee leads found.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow">
                <h2 className="text-2xl font-black text-slate-950">
                  Assigned Quiz Submissions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  These quiz leads belong to employees under your assigned HBT
                  team.
                </p>

                <div className="mt-5 overflow-x-auto">
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
                        <tr key={submission.id} className="border-b">
                          <td className="p-3 font-semibold">
                            {submission.quiz_title}
                          </td>

                          <td className="p-3">
                            <p>{submission.employee_name}</p>
                            <p className="text-xs text-slate-500">
                              {submission.employee_email}
                            </p>
                          </td>

                          <td className="p-3">
                            {submission.company_name || "N/A"}
                          </td>

                          <td className="p-3">
                            {submission.submitted_at
                              ? new Date(
                                  submission.submitted_at
                                ).toLocaleString()
                              : "-"}
                          </td>

                          <td className="p-3">
                            <select
                              className="rounded-lg border p-2"
                              value={submission.follow_up_status || "new"}
                              onChange={(e) =>
                                updateFollowUpStatus(
                                  submission.id,
                                  e.target.value
                                )
                              }
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="not_interested">
                                Not Interested
                              </option>
                            </select>
                          </td>

                          <td className="p-3">
                            <button
                              onClick={() => setSelectedSubmission(submission)}
                              className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white"
                            >
                              View Answers
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {latestSubmissions.length === 0 && (
                    <p className="mt-4 text-slate-500">
                      No quiz submissions found.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </section>

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                  Quiz Answers
                </p>

                <h2 className="mt-2 text-3xl font-black text-slate-950">
                  {selectedSubmission.employee_name}
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedSubmission.employee_email}
                </p>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              {selectedSubmission.answers &&
              selectedSubmission.answers.length > 0 ? (
                selectedSubmission.answers.map((answer, index) => (
                  <div key={index} className="rounded-2xl border p-4">
                    <p className="text-sm font-bold text-slate-500">
                      Question {index + 1}
                    </p>

                    <p className="mt-1 font-bold text-slate-950">
                      {answer.question_text}
                    </p>

                    <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-slate-800">
                      {answer.answer_text || "No answer provided"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-700">
                  No answers found for this submission.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <ChatWidget />
    </main>
  );
}

export default HBTMemberDashboard;
