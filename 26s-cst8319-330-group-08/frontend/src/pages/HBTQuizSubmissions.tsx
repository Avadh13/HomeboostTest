import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";

type Answer = { question_text: string; answer_text: string };

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

type Assignment = {
  employee_email: string;
  member_name: string;
  progress_percent: number;
};

const FOLLOW_UP_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "not_interested", label: "Not Interested" },
];

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : "—");

function HBTQuizSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [quizFilter, setQuizFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

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
      const headers = { Authorization: `Bearer ${token}` };
      const [submissionResponse, assignmentResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/quizzes/submissions`, { headers }),
        fetch(`${API_BASE_URL}/lead-progress/hbt`, { headers }),
      ]);

      const submissionData = await submissionResponse.json();
      const assignmentData = await assignmentResponse.json();

      if (!submissionResponse.ok) {
        alert(submissionData.message || "Failed to load quiz submissions");
        setSubmissions([]);
        return;
      }

      setSubmissions(Array.isArray(submissionData) ? submissionData : []);
      setAssignments(Array.isArray(assignmentData.assignments) ? assignmentData.assignments : []);
    } catch (error) {
      console.error("Failed to load quiz submissions:", error);
      alert("Failed to load quiz submissions");
      setSubmissions([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubmissions(); }, []);

  const assignmentByEmail = useMemo(() => {
    const map = new Map<string, Assignment>();
    assignments.forEach((assignment) => map.set(String(assignment.employee_email || "").toLowerCase(), assignment));
    return map;
  }, [assignments]);

  const companyOptions = useMemo(() => Array.from(new Set(submissions.map((item) => item.company_name).filter(Boolean))).sort(), [submissions]);
  const quizOptions = useMemo(() => Array.from(new Set(submissions.map((item) => item.quiz_title).filter(Boolean))).sort(), [submissions]);
  const assignedOptions = useMemo(() => Array.from(new Set(assignments.map((item) => item.member_name).filter(Boolean))).sort(), [assignments]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const search = searchText.toLowerCase().trim();
      const assignment = assignmentByEmail.get(String(submission.employee_email || "").toLowerCase());
      const assignedName = assignment?.member_name || "Unassigned";
      const matchesSearch = !search || [submission.quiz_title, submission.employee_name, submission.employee_email, submission.company_name, submission.team_name, assignedName].filter(Boolean).join(" ").toLowerCase().includes(search);
      const matchesCompany = companyFilter === "all" || submission.company_name === companyFilter;
      const matchesQuiz = quizFilter === "all" || submission.quiz_title === quizFilter;
      const currentStatus = submission.follow_up_status || "new";
      const matchesStatus = statusFilter === "all" || currentStatus === statusFilter;
      const matchesAssigned = assignedFilter === "all" || (assignedFilter === "unassigned" ? !assignment : assignedName === assignedFilter);
      return matchesSearch && matchesCompany && matchesQuiz && matchesStatus && matchesAssigned;
    });
  }, [assignmentByEmail, assignedFilter, companyFilter, quizFilter, searchText, statusFilter, submissions]);

  const clearFilters = () => {
    setSearchText("");
    setCompanyFilter("all");
    setQuizFilter("all");
    setStatusFilter("all");
    setAssignedFilter("all");
  };

  const updateFollowUpStatus = async (submissionId: number, followUpStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/submissions/${submissionId}/follow-up-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ follow_up_status: followUpStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Failed to update follow-up status");
        return;
      }
      setSubmissions((prev) => prev.map((submission) => submission.id === submissionId ? { ...submission, follow_up_status: followUpStatus } : submission));
      if (selectedSubmission?.id === submissionId) setSelectedSubmission({ ...selectedSubmission, follow_up_status: followUpStatus });
    } catch (error) {
      console.error("Follow-up status update failed:", error);
      alert("Failed to update follow-up status");
    }
  };

  const getStatusBadge = (status?: string) => {
    const finalStatus = status || "new";
    if (finalStatus === "completed") return "bg-green-100 text-green-700";
    if (finalStatus === "contacted" || finalStatus === "in_progress") return "bg-blue-100 text-blue-700";
    if (finalStatus === "not_interested") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const totalNewLeads = submissions.filter((submission) => !submission.follow_up_status || submission.follow_up_status === "new").length;

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="theme-panel">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to={isHbtMember ? "/hbt/member-dashboard" : "/hbt/dashboard"} className="text-sm font-black text-violet-200 hover:text-white">← Back to {isHbtMember ? "Member Dashboard" : "HBT Dashboard"}</Link>
            <button onClick={logout} className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:bg-red-700">Logout</button>
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-violet-200">Assigned Quiz Follow-Up Center</p>
          <h1 className="mt-3 text-4xl font-black">Employee Quiz Submissions</h1>
          <p className="mt-3 max-w-3xl text-violet-100">Review readiness quiz answers, filter by assigned HBT member, and track employee lead follow-up progress.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-4"><div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-violet-100">Total</p><p className="mt-1 text-3xl font-black">{submissions.length}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-violet-100">Companies</p><p className="mt-1 text-3xl font-black">{companyOptions.length}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-violet-100">Assigned Members</p><p className="mt-1 text-3xl font-black">{assignedOptions.length}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-violet-100">New Leads</p><p className="mt-1 text-3xl font-black">{totalNewLeads}</p></div></div>
        </header>

        <section className="premium-card">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="eyebrow">Search & filters</p><h2 className="mt-1 text-2xl font-black text-slate-950">Filter submissions</h2><p className="text-sm text-slate-500">Find submissions by employee, quiz, company, assigned member, or status.</p></div><button onClick={clearFilters} className="btn-secondary">Clear Filters</button></div>
          <div className="grid gap-4 md:grid-cols-5"><input className="form-field" placeholder="Search employee, advisor, email..." value={searchText} onChange={(event) => setSearchText(event.target.value)} /><select className="form-field" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}><option value="all">All Companies</option>{companyOptions.map((company) => <option key={company} value={company}>{company}</option>)}</select><select className="form-field" value={quizFilter} onChange={(event) => setQuizFilter(event.target.value)}><option value="all">All Quizzes</option>{quizOptions.map((quiz) => <option key={quiz} value={quiz}>{quiz}</option>)}</select><select className="form-field" value={assignedFilter} onChange={(event) => setAssignedFilter(event.target.value)}><option value="all">All Assigned</option><option value="unassigned">Unassigned</option>{assignedOptions.map((member) => <option key={member} value={member}>{member}</option>)}</select><select className="form-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All Status</option>{FOLLOW_UP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">Showing {filteredSubmissions.length} of {submissions.length} submissions</div>
        </section>

        <section className="premium-card">
          {loading ? <p className="text-slate-600">Loading submissions...</p> : filteredSubmissions.length === 0 ? <p className="rounded-3xl bg-slate-50 p-8 text-center text-slate-500">No submissions match your filters.</p> : <div className="grid gap-4 xl:grid-cols-2">{filteredSubmissions.map((submission) => { const assignment = assignmentByEmail.get(String(submission.employee_email || "").toLowerCase()); return <article key={submission.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-violet-600">{submission.company_name}</p><h3 className="mt-1 text-xl font-black text-slate-950">{submission.employee_name}</h3><p className="text-sm font-semibold text-slate-500">{submission.employee_email}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${getStatusBadge(submission.follow_up_status)}`}>{submission.follow_up_status || "new"}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white p-3"><p className="text-xs font-black uppercase text-slate-400">Quiz</p><p className="mt-1 text-sm font-bold text-slate-700">{submission.quiz_title}</p></div><div className="rounded-2xl bg-white p-3"><p className="text-xs font-black uppercase text-slate-400">Assigned</p><p className="mt-1 text-sm font-bold text-slate-700">{assignment?.member_name || "Unassigned"}</p></div><div className="rounded-2xl bg-white p-3"><p className="text-xs font-black uppercase text-slate-400">Progress</p><p className="mt-1 text-sm font-bold text-slate-700">{assignment?.progress_percent || 0}%</p></div></div><p className="mt-3 text-xs font-bold text-slate-500">Submitted {formatDate(submission.submitted_at)}</p><div className="mt-4 flex flex-wrap gap-2"><select className="form-field max-w-[220px]" value={submission.follow_up_status || "new"} onChange={(event) => updateFollowUpStatus(submission.id, event.target.value)}>{FOLLOW_UP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button onClick={() => setSelectedSubmission(submission)} className="btn-dark">View Answers</button></div></article>; })}</div>}
        </section>

        {selectedSubmission && <section className="premium-card"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Answers</p><h2 className="mt-1 text-2xl font-black text-slate-950">{selectedSubmission.employee_name}</h2><p className="text-sm text-slate-500">{selectedSubmission.quiz_title}</p></div><button onClick={() => setSelectedSubmission(null)} className="btn-secondary">Close</button></div><div className="grid gap-3">{selectedSubmission.answers?.map((answer, index) => <div key={`${answer.question_text}-${index}`} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Question</p><h3 className="mt-1 font-black text-slate-950">{answer.question_text}</h3><p className="mt-2 text-sm leading-relaxed text-slate-700">{answer.answer_text || "No answer"}</p></div>)}{(!selectedSubmission.answers || selectedSubmission.answers.length === 0) && <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">No answers found.</p>}</div></section>}
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTQuizSubmissions;
