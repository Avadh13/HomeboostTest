import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type Metrics = Record<string, number>;
type Bucket = { label: string; value: number };
type EmployeeReportRow = {
  id: number;
  full_name: string;
  email: string;
  employer_name?: string | null;
  partnership_slug?: string | null;
  quiz_count?: number;
  last_quiz_at?: string | null;
  readiness_score?: number | null;
  readiness_level?: string | null;
  readiness_priority?: string | null;
  document_count?: number;
  approved_document_count?: number;
  current_journey?: string | null;
  journey_status?: string | null;
};

type SummaryPayload = {
  metrics: Metrics;
  readiness_buckets: Bucket[];
  document_buckets: Bucket[];
  generated_at: string;
};

const labels: Record<string, string> = {
  partnerships: "Partnerships",
  employers: "Employers",
  employees: "Employees",
  quiz_submissions: "Quiz submissions",
  journey_assignments: "Journey assignments",
  uploaded_documents: "Documents uploaded",
  pending_documents: "Pending documents",
  pending_approvals: "Pending approvals",
  exports_generated: "My exports",
};

function ReportsExportCenter() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [employees, setEmployees] = useState<EmployeeReportRow[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const loadReports = async () => {
    setLoading(true);
    try {
      const [summaryResponse, employeeResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/reports/summary`, { headers }),
        fetch(`${API_BASE_URL}/reports/employee-engagement`, { headers }),
      ]);
      const [summaryData, employeeData] = await Promise.all([summaryResponse.json(), employeeResponse.json()]);
      setSummary(summaryData.status === "success" ? summaryData : null);
      setEmployees(Array.isArray(employeeData.employees) ? employeeData.employees : []);
    } catch {
      setSummary(null);
      setEmployees([]);
      setNotice("Could not load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, []);

  const downloadExport = async (type: string) => {
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/reports/exports/${type}`, { headers });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-export.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      setNotice("CSV export downloaded.");
      loadReports();
    } catch {
      setNotice("Export failed. Check permissions or try again.");
    }
  };

  const metricEntries = summary ? Object.entries(summary.metrics || {}) : [];

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container space-y-6">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Reports + Export Center</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Track adoption, readiness, and handoff data.</h1>
            <p className="mt-4 max-w-3xl text-slate-300">View scoped operational metrics and download CSVs for employees, quiz submissions, documents, and employer approvals.</p>
          </div>

          {notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700 ring-1 ring-blue-100">{notice}</div>}

          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {loading ? <div className="premium-card col-span-full text-center font-black">Loading reports...</div> : metricEntries.map(([key, value]) => (
              <div key={key} className="metric-card">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{labels[key] || key.replace(/_/g, " ")}</p>
                <h2 className="mt-2 text-3xl font-black text-blue-700">{Number(value || 0)}</h2>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <aside className="space-y-6">
              <div className="premium-card">
                <p className="eyebrow text-blue-600">CSV exports</p>
                <h2 className="mt-2 text-2xl font-black">Download data</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Exports are scoped by your role. HBT users only export their team data; company users only export their partnership data.</p>
                <div className="mt-5 grid gap-3">
                  {[['employees', 'Employees'], ['quiz-submissions', 'Quiz submissions'], ['documents', 'Documents'], ['approvals', 'Employer approvals']].map(([type, label]) => (
                    <button key={type} onClick={() => downloadExport(type)} className="rounded-2xl bg-slate-950 px-4 py-3 text-left text-sm font-black text-white hover:bg-blue-700">Download {label}</button>
                  ))}
                </div>
              </div>

              <div className="premium-card">
                <p className="eyebrow text-emerald-600">Readiness split</p>
                <div className="mt-4 space-y-3">
                  {(summary?.readiness_buckets || []).length === 0 ? <p className="text-sm font-bold text-slate-500">No readiness data yet.</p> : summary?.readiness_buckets.map((bucket) => (
                    <div key={bucket.label} className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex justify-between text-sm font-black"><span>{bucket.label}</span><span>{bucket.value}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="premium-card">
                <p className="eyebrow text-violet-600">Document status</p>
                <div className="mt-4 space-y-3">
                  {(summary?.document_buckets || []).length === 0 ? <p className="text-sm font-bold text-slate-500">No document data yet.</p> : summary?.document_buckets.map((bucket) => (
                    <div key={bucket.label} className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex justify-between text-sm font-black"><span>{bucket.label.replace(/_/g, " ")}</span><span>{bucket.value}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <section className="premium-card overflow-hidden">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><p className="eyebrow text-blue-600">Employee engagement</p><h2 className="text-2xl font-black">Latest employees</h2></div>
                <button onClick={loadReports} className="btn-secondary">Refresh</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Employer</th><th className="px-4 py-3">Readiness</th><th className="px-4 py-3">Journey</th><th className="px-4 py-3">Quizzes</th><th className="px-4 py-3">Docs</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center font-bold text-slate-500">No employee report rows yet.</td></tr> : employees.slice(0, 60).map((employee) => (
                      <tr key={employee.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3"><p className="font-black text-slate-950">{employee.full_name}</p><p className="text-xs font-semibold text-slate-500">{employee.email}</p></td>
                        <td className="px-4 py-3 font-bold text-slate-600">{employee.employer_name || employee.partnership_slug || "—"}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{employee.readiness_score ?? "—"} {employee.readiness_level || ""}</span></td>
                        <td className="px-4 py-3 font-bold text-slate-600">{employee.current_journey || "Not assigned"}</td>
                        <td className="px-4 py-3 font-black text-slate-950">{employee.quiz_count || 0}</td>
                        <td className="px-4 py-3 font-black text-slate-950">{employee.approved_document_count || 0}/{employee.document_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}

export default ReportsExportCenter;
