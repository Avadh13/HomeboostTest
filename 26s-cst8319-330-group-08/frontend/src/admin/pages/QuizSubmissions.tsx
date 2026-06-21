import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import ChatWidget from "../../components/ChatWidget";
type Submission = {
  id: number;
  quiz_id: number;
  user_id: number;
  partnership_id?: number | null;
  submitted_at: string;
  quiz_title: string;
  employee_name: string;
  employee_email: string;
  company_name: string;
  team_name: string;
  partnership_slug?: string | null;
  journey_result?: string | null;
  follow_up_status?: string | null;
  answers?: Answer[];
};

type Answer = {
  id: number;
  answer_text: string;
  question_text: string;
  question_type: string;
};

type SubmissionDetails = {
  submission: Submission;
  answers: Answer[];
};

const FOLLOW_UP_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "not_interested", label: "Not Interested" },
];

function QuizSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedDetails, setSelectedDetails] =
    useState<SubmissionDetails | null>(null);

  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [quizFilter, setQuizFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [hbtFilter, setHbtFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const token = localStorage.getItem("token");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/quizzes/submissions`, {
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load quiz submissions");
        setSubmissions([]);
        return;
      }

      if (Array.isArray(data)) {
        setSubmissions(data);
      } else {
        console.log("Submission API error:", data);
        setSubmissions([]);
      }
    } catch (error) {
      console.log("Failed to load quiz submissions:", error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const viewDetails = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/submissions/${id}`, {
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load submission details");
        return;
      }

      setSelectedDetails(data);
    } catch (error) {
      console.log("Failed to load submission details:", error);
      alert("Failed to load submission details");
    }
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

      if (selectedDetails?.submission.id === submissionId) {
        setSelectedDetails({
          ...selectedDetails,
          submission: {
            ...selectedDetails.submission,
            follow_up_status: followUpStatus,
          },
        });
      }
    } catch (error) {
      console.log("Failed to update follow-up status:", error);
      alert("Failed to update follow-up status");
    }
  };

  const quizOptions = useMemo(() => {
    const quizzes = new Set<string>();

    submissions.forEach((submission) => {
      if (submission.quiz_title) quizzes.add(submission.quiz_title);
    });

    return Array.from(quizzes).sort();
  }, [submissions]);

  const companyOptions = useMemo(() => {
    const companies = new Set<string>();

    submissions.forEach((submission) => {
      if (submission.company_name) companies.add(submission.company_name);
    });

    return Array.from(companies).sort();
  }, [submissions]);

  const hbtOptions = useMemo(() => {
    const teams = new Set<string>();

    submissions.forEach((submission) => {
      if (submission.team_name) teams.add(submission.team_name);
    });

    return Array.from(teams).sort();
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const search = searchText.toLowerCase().trim();

      const currentStatus = submission.follow_up_status || "new";

      const matchesSearch =
        !search ||
        submission.quiz_title?.toLowerCase().includes(search) ||
        submission.employee_name?.toLowerCase().includes(search) ||
        submission.employee_email?.toLowerCase().includes(search) ||
        submission.company_name?.toLowerCase().includes(search) ||
        submission.team_name?.toLowerCase().includes(search);

      const matchesQuiz =
        quizFilter === "all" || submission.quiz_title === quizFilter;

      const matchesCompany =
        companyFilter === "all" || submission.company_name === companyFilter;

      const matchesHBT =
        hbtFilter === "all" || submission.team_name === hbtFilter;

      const matchesStatus =
        statusFilter === "all" || currentStatus === statusFilter;

      return (
        matchesSearch &&
        matchesQuiz &&
        matchesCompany &&
        matchesHBT &&
        matchesStatus
      );
    });
  }, [
    submissions,
    searchText,
    quizFilter,
    companyFilter,
    hbtFilter,
    statusFilter,
  ]);

  const clearFilters = () => {
    setSearchText("");
    setQuizFilter("all");
    setCompanyFilter("all");
    setHbtFilter("all");
    setStatusFilter("all");
  };

  const countByKey = (key: keyof Submission) => {
    const counts: { label: string; value: number }[] = [];

    submissions.forEach((submission) => {
      const label = String(submission[key] || "N/A");
      const existing = counts.find((item) => item.label === label);

      if (existing) {
        existing.value += 1;
      } else {
        counts.push({ label, value: 1 });
      }
    });

    return counts.sort((a, b) => b.value - a.value);
  };

  const quizChartData = countByKey("quiz_title").slice(0, 6);
  const companyChartData = countByKey("company_name").slice(0, 6);
  const hbtChartData = countByKey("team_name").slice(0, 6);

  const statusChartData = FOLLOW_UP_OPTIONS.map((option) => ({
    label: option.label,
    value: submissions.filter(
      (submission) => (submission.follow_up_status || "new") === option.value
    ).length,
    valueKey: option.value,
  }));

  const maxQuizValue = Math.max(...quizChartData.map((item) => item.value), 1);
  const maxCompanyValue = Math.max(
    ...companyChartData.map((item) => item.value),
    1
  );
  const maxHbtValue = Math.max(...hbtChartData.map((item) => item.value), 1);
  const maxStatusValue = Math.max(
    ...statusChartData.map((item) => item.value),
    1
  );

  const totalSubmissions = submissions.length;
  const newLeads = submissions.filter(
    (submission) =>
      !submission.follow_up_status || submission.follow_up_status === "new"
  ).length;
  const contactedLeads = submissions.filter(
    (submission) => submission.follow_up_status === "contacted"
  ).length;
  const inProgressLeads = submissions.filter(
    (submission) => submission.follow_up_status === "in_progress"
  ).length;
  const completedLeads = submissions.filter(
    (submission) => submission.follow_up_status === "completed"
  ).length;

  const getStatusBadge = (status?: string | null) => {
    const currentStatus = status || "new";

    if (currentStatus === "completed") {
      return "bg-green-100 text-green-700";
    }

    if (currentStatus === "contacted" || currentStatus === "in_progress") {
      return "bg-blue-100 text-blue-700";
    }

    if (currentStatus === "not_interested") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  const formatStatus = (status?: string | null) => {
    return (status || "new")
      .replace("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const MiniBarChart = ({
    title,
    subtitle,
    data,
    maxValue,
    barClassName,
  }: {
    title: string;
    subtitle: string;
    data: { label: string; value: number }[];
    maxValue: number;
    barClassName: string;
  }) => {
    return (
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-5">
          <h3 className="text-xl font-black text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="space-y-4">
          {data.length === 0 && (
            <p className="text-sm text-slate-500">No data available.</p>
          )}

          {data.map((item) => {
            const width = Math.max((item.value / maxValue) * 100, 6);

            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="max-w-[220px] truncate font-semibold text-slate-700">
                    {item.label}
                  </span>
                  <span className="font-black text-slate-950">
                    {item.value}
                  </span>
                </div>

                <div className="h-4 rounded-full bg-slate-100">
                  <div
                    className={`h-4 rounded-full ${barClassName}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Quiz Submissions">
      <div className="space-y-8">
        <section className="rounded-3xl bg-gradient-to-r from-slate-950 to-blue-950 p-8 text-white shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
            Quiz Intelligence
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Admin Quiz Submissions
          </h1>

          <p className="mt-3 max-w-3xl text-blue-100">
            Preview all employee quiz activity across companies and HBT teams,
            review answers, and track follow-up progress from one admin page.
          </p>
        </section>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-slate-600">Loading quiz submissions...</p>
          </div>
        ) : (
          <>
            <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm font-semibold text-slate-500">
                  Total Submissions
                </p>
                <h2 className="mt-2 text-5xl font-black text-slate-950">
                  {totalSubmissions}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm font-semibold text-slate-500">
                  New Leads
                </p>
                <h2 className="mt-2 text-5xl font-black text-yellow-600">
                  {newLeads}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm font-semibold text-slate-500">
                  Contacted
                </p>
                <h2 className="mt-2 text-5xl font-black text-blue-600">
                  {contactedLeads}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm font-semibold text-slate-500">
                  In Progress
                </p>
                <h2 className="mt-2 text-5xl font-black text-indigo-600">
                  {inProgressLeads}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm font-semibold text-slate-500">
                  Completed
                </p>
                <h2 className="mt-2 text-5xl font-black text-green-600">
                  {completedLeads}
                </h2>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <MiniBarChart
                title="Submissions by Quiz"
                subtitle="Most submitted quizzes across the platform."
                data={quizChartData}
                maxValue={maxQuizValue}
                barClassName="bg-blue-600"
              />

              <MiniBarChart
                title="Submissions by Company"
                subtitle="Employer companies with the most quiz activity."
                data={companyChartData}
                maxValue={maxCompanyValue}
                barClassName="bg-purple-600"
              />

              <MiniBarChart
                title="Submissions by HBT Team"
                subtitle="HBT teams receiving employee quiz leads."
                data={hbtChartData}
                maxValue={maxHbtValue}
                barClassName="bg-indigo-600"
              />

              <MiniBarChart
                title="Follow-Up Status Overview"
                subtitle="Lead pipeline based on HBT/admin follow-up progress."
                data={statusChartData}
                maxValue={maxStatusValue}
                barClassName="bg-green-600"
              />
            </section>

            <section className="rounded-3xl bg-white p-6 shadow">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Search & Filters
                  </h2>
                  <p className="text-sm text-slate-500">
                    Filter submissions by quiz, company, HBT team, employee, or
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

              <div className="grid gap-4 md:grid-cols-5">
                <input
                  className="rounded-xl border p-3"
                  placeholder="Search employee, email, company..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />

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
                  value={hbtFilter}
                  onChange={(e) => setHbtFilter(e.target.value)}
                >
                  <option value="all">All HBT Teams</option>
                  {hbtOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>

                <select
                  className="rounded-xl border p-3"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
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

            <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <div className="rounded-3xl bg-white p-6 shadow">
                <h2 className="mb-4 text-2xl font-black text-slate-950">
                  All Quiz Submissions
                </h2>

                {filteredSubmissions.length === 0 && (
                  <p className="text-slate-500">
                    No quiz submissions matched your filters.
                  </p>
                )}

                <div className="space-y-4">
                  {filteredSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="rounded-2xl border p-5 hover:bg-slate-50"
                    >
                      <div className="flex flex-col justify-between gap-4 xl:flex-row">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-slate-950">
                              {submission.quiz_title || "Untitled Quiz"}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                                submission.follow_up_status
                              )}`}
                            >
                              {formatStatus(submission.follow_up_status)}
                            </span>
                          </div>

                          <p className="mt-2 text-slate-600">
                            Employee:{" "}
                            <span className="font-semibold">
                              {submission.employee_name || "N/A"}
                            </span>
                          </p>

                          <p className="text-slate-600">
                            Email: {submission.employee_email || "N/A"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                              Company: {submission.company_name || "N/A"}
                            </span>

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              HBT: {submission.team_name || "N/A"}
                            </span>

                            {submission.partnership_slug && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                /{submission.partnership_slug}
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-sm text-slate-500">
                            Submitted:{" "}
                            {submission.submitted_at
                              ? new Date(
                                  submission.submitted_at
                                ).toLocaleString()
                              : "N/A"}
                          </p>
                        </div>

                        <div className="flex min-w-[190px] flex-col gap-3">
                          <select
                            className="rounded-xl border p-3 text-sm font-semibold"
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

                          <button
                            onClick={() => viewDetails(submission.id)}
                            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-black"
                          >
                            View Answers
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow">
                <h2 className="mb-4 text-2xl font-black text-slate-950">
                  Submission Details
                </h2>

                {!selectedDetails && (
                  <p className="text-slate-500">
                    Select a submission to view employee answers.
                  </p>
                )}

                {selectedDetails && (
                  <div>
                    <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                      <h3 className="text-xl font-black text-slate-950">
                        {selectedDetails.submission.quiz_title}
                      </h3>

                      <p className="mt-2 text-sm text-slate-600">
                        Employee: {selectedDetails.submission.employee_name}
                      </p>

                      <p className="text-sm text-slate-600">
                        Email: {selectedDetails.submission.employee_email}
                      </p>

                      <p className="text-sm text-slate-600">
                        Company:{" "}
                        {selectedDetails.submission.company_name || "N/A"}
                      </p>

                      <p className="text-sm text-slate-600">
                        HBT: {selectedDetails.submission.team_name || "N/A"}
                      </p>

                      <div className="mt-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                            selectedDetails.submission.follow_up_status
                          )}`}
                        >
                          {formatStatus(
                            selectedDetails.submission.follow_up_status
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {selectedDetails.answers.map((answer, index) => (
                        <div key={answer.id} className="rounded-2xl border p-4">
                          <p className="text-sm font-bold text-slate-500">
                            Question {index + 1}
                          </p>

                          <p className="mt-1 font-bold text-slate-950">
                            {answer.question_text || "Question not found"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Type: {answer.question_type || "N/A"}
                          </p>

                          <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-slate-800">
                            {String(answer.answer_text || "No answer")}
                          </p>
                        </div>
                      ))}

                      {selectedDetails.answers.length === 0 && (
                        <p className="text-slate-500">
                          No answers found for this submission.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
      <ChatWidget />
    </AdminLayout>
  );
}

export default QuizSubmissions;