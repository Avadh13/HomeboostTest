import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { readStoredToken, readStoredUser } from "../utils/auth";

type Summary = {
  total_employees: number;
  active_employees: number;
  quiz_completion_rate: number;
  resource_view_count: number;
  average_readiness_score: number;
  engagement_score: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  top_employee_needs: Array<{ label: string; count: number }>;
};

type Payload = {
  partnership?: { employer_name?: string };
  summary?: Summary;
};

function CompanyROIWidget() {
  const { pathname } = useLocation();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const user = readStoredUser();
  const token = readStoredToken();
  const shouldShow = Boolean(
    pathname === "/company/dashboard" &&
      ["company", "company_admin"].includes(String(user?.role || "")) &&
      token,
  );

  useEffect(() => {
    setLoaded(false);
    if (!shouldShow || !token) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/company-analytics/summary`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Failed to load analytics");
        setPayload(data.status === "success" ? data : null);
      } catch {
        if (!controller.signal.aborted) setPayload(null);
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    };

    load();
    return () => controller.abort();
  }, [shouldShow, token]);

  if (!shouldShow || !loaded || !payload?.summary) return null;

  const summary = payload.summary;
  const needs = Array.isArray(summary.top_employee_needs) ? summary.top_employee_needs : [];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6">
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-lg shadow-slate-200/60">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Employer ROI</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Engagement snapshot</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">Aggregated company-level data only</p>
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl font-black text-emerald-700 ring-1 ring-emerald-100">
            {Number(summary.engagement_score || 0)}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl bg-blue-50 p-3 text-center"><p className="text-xl font-black text-blue-700">{Number(summary.quiz_completion_rate || 0)}%</p><p className="text-[10px] font-black uppercase text-blue-700">Quiz</p></div>
          <div className="rounded-2xl bg-violet-50 p-3 text-center"><p className="text-xl font-black text-violet-700">{Number(summary.average_readiness_score || 0)}</p><p className="text-[10px] font-black uppercase text-violet-700">Avg score</p></div>
          <div className="rounded-2xl bg-sky-50 p-3 text-center"><p className="text-xl font-black text-sky-700">{Number(summary.resource_view_count || 0)}</p><p className="text-[10px] font-black uppercase text-sky-700">Views</p></div>
          <div className="rounded-2xl bg-red-50 p-3 text-center"><p className="text-xl font-black text-red-700">{Number(summary.hot_leads || 0)}</p><p className="text-[10px] font-black uppercase text-red-700">Hot</p></div>
          <div className="rounded-2xl bg-amber-50 p-3 text-center"><p className="text-xl font-black text-amber-700">{Number(summary.warm_leads || 0)}</p><p className="text-[10px] font-black uppercase text-amber-700">Warm</p></div>
          <div className="rounded-2xl bg-slate-100 p-3 text-center"><p className="text-xl font-black text-slate-700">{Number(summary.cold_leads || 0)}</p><p className="text-[10px] font-black uppercase text-slate-600">Cold</p></div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Top employee needs</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {needs.length > 0 ? needs.slice(0, 3).map((need) => (
              <p key={need.label} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
                {need.label} <span className="text-slate-400">({need.count})</span>
              </p>
            )) : (
              <p className="text-xs font-bold text-slate-500 md:col-span-3">Needs will appear after employees submit quizzes.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CompanyROIWidget;
