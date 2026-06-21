import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
type Answer = {
  question_text: string;
  answer_text: string;
};

type Submission = {
  id: number;
  quiz_title: string;
  employee_name: string;
  employee_email: string;
  company_name: string;
  team_name: string;
  submitted_at: string;
  follow_up_status?: string;
  answers?: Answer[];
};

const FOLLOW_UP_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "not_interested", label: "Not Interested" },
];

function HBTQuizSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [quizFilter, setQuizFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isHbtMember = user.role === "hbt_member";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/quizzes/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load quiz submissions");
        setSubmissions([]);
        return;
      }

      setSubmissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load quiz submissions:", error);
      alert("Failed to load quiz submissions");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const companyOptions = useMemo(() => {
    const companies = new Set<string>();

    submissions.forEach((submission) => {
      if (submission.company_name) {
        companies.add(submission.company_name);
      }
    });

    return Array.from(companies).sort();
  }, [submissions]);

  const quizOptions = useMemo(() => {
    const quizzes = new Set<string>();

    submissions.forEach((submission) => {
      if (submission.quiz_title) {
        quizzes.add(submission.quiz_title);
      }
    });

    return Array.from(quizzes).sort();
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const search = searchText.toLowerCase().trim();

      const matchesSearch =
        !search ||
        submission.quiz_title?.toLowerCase().includes(search) ||
        submission.employee_name?.toLowerCase().includes(search) ||
        submission.employee_email?.toLowerCase().includes(search) ||
        submission.company_name?.toLowerCase().includes(search) ||
        submission.team_name?.toLowerCase().includes(search);

      const matchesCompany =
        companyFilter === "all" || submission.company_name === companyFilter;

      const matchesQuiz =
        quizFilter === "all" || submission.quiz_title === quizFilter;

      const currentStatus = submission.follow_up_status || "new";

      const matchesStatus =
        statusFilter === "all" || currentStatus === statusFilter;

      return matchesSearch && matchesCompany && matchesQuiz && matchesStatus;
    });
  }, [submissions, searchText, companyFilter, quizFilter, statusFilter]);

  const clearFilters = () => {
    setSearchText("");
    setCompanyFilter("all");
    setQuizFilter("all");
    setStatusFilter("all");
  };

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
          body: JSON.stringify({
            follow_up_status: followUpStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to update follow-up status");
        return;
      }

      setSubmissions((prev) =>
        prev.map((submission) =>
          submission.id === submissionId
            ? { ...submission, follow_up_status: followUpStatus }
            : submission
        )
      );

      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission({
          ...selectedSubmission,
          follow_up_status: followUpStatus,
        });
      }
    } catch (error) {
      console.error("Follow-up status update failed:", error);
      alert("Failed to update follow-up status");
    }
  };

  const getStatusBadge = (status?: string) => {
    const finalStatus = status || "new";

    if (finalStatus === "completed") {
      return "bg-green-100 text-green-700";
    }

    if (finalStatus === "contacted" || finalStatus === "in_progress") {
      return "bg-blue-100 text-blue-700";
    }

    if (finalStatus === "not_interested") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  const totalNewLeads = submissions.filter(
    (submission) =>
      !submission.follow_up_status || submission.follow_up_status === "new"
  ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to={isHbtMember ? "/hbt/member-dashboard" : "/hbt/dashboard"}
            className="flex items-center gap-3"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 font-black text-white shadow-lg shadow-blue-500/30">
              HB
            </span>

            <div>
              <p className="text-2xl font-black text-slate-950">HomeBoost</p>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                {isHbtMember ? "HBT Member Portal" : "HBT Admin Portal"}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-bold text-slate-950">
                {user.full_name || "HBT User"}
              </p>
              <p className="text-xs font-bold uppercase text-slate-500">
                {isHbtMember ? "HBT Member" : "HBT Admin"}
              </p>
            </div>

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
          <Link
            to={isHbtMember ? "/hbt/member-dashboard" : "/hbt/dashboard"}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Back to {isHbtMember ? "Member Dashboard" : "HBT Dashboard"}
          </Link>

          <section className="rounded-3xl bg-gradient-to-r from-slate-950 to-blue-950 p-8 text-white shadow-xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
              Quiz Follow-Up Center
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Employee Quiz Submissions
            </h1>

            <p className="mt-3 max-w-3xl text-blue-100">
              Review employee readiness quiz answers, filter by employer
              partnership, and track follow-up progress for your assigned
              companies.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Total Submissions</p>
                <p className="mt-1 text-3xl font-black">
                  {submissions.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Companies</p>
                <p className="mt-1 text-3xl font-black">
                  {companyOptions.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">New Leads</p>
                <p className="mt-1 text-3xl font-black">{totalNewLeads}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Search & Filters
                </h2>
                <p className="text-sm text-slate-500">
                  Find submissions by employee, email, company, quiz, or
                  follow-up status.
                </p>
              </div>

              <button
                onClick={clearFilters}
                className="rounded-full border px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Clear Filters
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <input
                className="rounded-xl border p-3"
                placeholder="Search employee, email, company..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <select
                className="rounded-xl border p-3"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="all">All Companies</option>
                {companyOptions.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border p-3"
                value={quizFilter}
                onChange={(e) => setQuizFilter(e.target.value)}
              >
                <option value="all">All Quizzes</option>
                {quizOptions.map((quiz) => (
                  <option key={quiz} value={quiz}>
                    {quiz}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border p-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Follow-Up Status</option>
                {FOLLOW_UP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
              Showing {filteredSubmissions.length} of {submissions.length}{" "}
              submissions
            </div>
          </section>

          <section className="overflow-x-auto rounded-3xl bg-white p-6 shadow">
            {loading ? (
              <p className="text-slate-600">Loading submissions...</p>
            ) : (
              <>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-600">
                      <th className="p-3">Quiz</th>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Employer</th>
                      <th className="p-3">Submitted</th>
                      <th className="p-3">Follow-Up</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Answers</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSubmissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="border-b hover:bg-slate-50"
                      >
                        <td className="p-3 font-semibold">
                          {submission.quiz_title}
                        </td>

                        <td className="p-3">{submission.employee_name}</td>

                        <td className="p-3">{submission.employee_email}</td>

                        <td className="p-3">
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                            {submission.company_name || "N/A"}
                          </span>
                        </td>

                        <td className="p-3">
                          {submission.submitted_at
                            ? new Date(submission.submitted_at).toLocaleString()
                            : "-"}
                        </td>

                        <td className="p-3">
                          <div className="space-y-2">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                                submission.follow_up_status
                              )}`}
                            >
                              {(submission.follow_up_status || "new").replace(
                                "_",
                                " "
                              )}
                            </span>

                            <select
                              className="block rounded border p-2 text-xs"
                              value={submission.follow_up_status || "new"}
                              onChange={(e) =>
                                updateFollowUpStatus(
                                  submission.id,
                                  e.target.value
                                )
                              }
                            >
                              {FOLLOW_UP_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="p-3">
                          <a
                            href={`mailto:${submission.employee_email}`}
                            className="rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700"
                          >
                            Email
                          </a>
                        </td>

                        <td className="p-3">
                          <button
                            onClick={() => setSelectedSubmission(submission)}
                            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            View Answers
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredSubmissions.length === 0 && (
                  <p className="mt-4 text-slate-500">
                    No submissions matched your filters.
                  </p>
                )}
              </>
            )}
          </section>
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

                <p className="mt-1 text-sm font-semibold text-purple-700">
                  {selectedSubmission.company_name}
                </p>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-900">
                {selectedSubmission.quiz_title}
              </p>

              <p className="text-sm text-slate-500">
                Submitted:{" "}
                {selectedSubmission.submitted_at
                  ? new Date(selectedSubmission.submitted_at).toLocaleString()
                  : "-"}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {selectedSubmission.answers &&
              selectedSubmission.answers.length > 0 ? (
                selectedSubmission.answers.map((answer, index) => (
                  <div key={index} className="rounded-2xl border p-4">
                    <p className="text-sm font-bold text-slate-500">
                      Question {index + 1}
                    </p>

                    <h3 className="mt-1 font-bold text-slate-950">
                      {answer.question_text}
                    </h3>

                    <p className="mt-3 rounded-xl bg-blue-50 p-3 text-slate-800">
                      {answer.answer_text || "No answer provided"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-700">
                  Answers are not loaded yet. Backend needs to return answers
                  with each submission.
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

export default HBTQuizSubmissions;