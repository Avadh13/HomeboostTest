import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type ReadinessCheck = {
  key: string;
  label: string;
  passed: boolean;
  severity: string;
  status: "pass" | "warn" | "fail";
  detail?: string;
};

type ReadinessPayload = {
  readiness: string;
  score: number;
  passed: number;
  warnings: number;
  failed: number;
  checks: ReadinessCheck[];
  generated_at: string;
};

const statusTone = (status: string) => {
  if (status === "pass") return "bg-emerald-100 text-emerald-700";
  if (status === "warn") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
};

function DeploymentReadinessCenter() {
  const [payload, setPayload] = useState<ReadinessPayload | null>(null);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const loadReadiness = async () => {
    setLoading(true);
    setNotice("");
    try {
      const [readinessResponse, checklistResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/qa/deployment-readiness`, { headers }),
        fetch(`${API_BASE_URL}/qa/security-checklist`, { headers }),
      ]);
      const [readinessData, checklistData] = await Promise.all([readinessResponse.json(), checklistResponse.json()]);
      setPayload(readinessData.status === "success" ? readinessData : null);
      setChecklist(Array.isArray(checklistData.checklist) ? checklistData.checklist : []);
      if (readinessData.status !== "success") setNotice(readinessData.message || "Could not run readiness checks.");
    } catch {
      setPayload(null);
      setChecklist([]);
      setNotice("Could not run readiness checks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReadiness(); }, []);

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container space-y-6">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Final QA + Deployment Polish</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Deployment readiness center.</h1>
            <p className="mt-4 max-w-3xl text-slate-300">Check production environment, database tables, secure document storage, payment readiness, and final demo/security tasks.</p>
          </div>

          {notice && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">{notice}</div>}

          <section className="grid gap-4 md:grid-cols-4">
            <div className="metric-card"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Readiness score</p><h2 className="mt-2 text-4xl font-black text-emerald-700">{loading ? "..." : `${payload?.score || 0}%`}</h2></div>
            <div className="metric-card"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Passed</p><h2 className="mt-2 text-4xl font-black text-emerald-700">{payload?.passed || 0}</h2></div>
            <div className="metric-card"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Warnings</p><h2 className="mt-2 text-4xl font-black text-amber-700">{payload?.warnings || 0}</h2></div>
            <div className="metric-card"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Failed</p><h2 className="mt-2 text-4xl font-black text-red-700">{payload?.failed || 0}</h2></div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="premium-card">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><p className="eyebrow text-emerald-600">Automated checks</p><h2 className="text-2xl font-black">System readiness</h2></div>
                <button onClick={loadReadiness} className="btn-secondary">Run Again</button>
              </div>
              {loading ? <div className="loading-state">Running checks...</div> : !payload ? <div className="empty-state">No readiness data.</div> : (
                <div className="space-y-3">
                  {payload.checks.map((check) => (
                    <div key={check.key} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-slate-950">{check.label}</h3>
                          {check.detail && <p className="mt-1 text-sm font-semibold text-slate-500">{check.detail}</p>}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusTone(check.status)}`}>{check.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <div className="premium-card">
                <p className="eyebrow text-blue-600">Deploy commands</p>
                <h2 className="mt-2 text-2xl font-black">Run before deploy</h2>
                <div className="mt-4 space-y-3 text-sm font-mono text-slate-700">
                  <div className="rounded-2xl bg-slate-100 p-3">cd backend && npm test</div>
                  <div className="rounded-2xl bg-slate-100 p-3">cd frontend && npm run build</div>
                  <div className="rounded-2xl bg-slate-100 p-3">git status</div>
                </div>
              </div>

              <div className="premium-card">
                <p className="eyebrow text-violet-600">Manual checklist</p>
                <h2 className="mt-2 text-2xl font-black">Demo/security tasks</h2>
                <div className="mt-4 space-y-3">
                  {checklist.map((item) => (
                    <div key={item} className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">{item}</div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default DeploymentReadinessCenter;
