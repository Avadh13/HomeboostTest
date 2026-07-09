import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";

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

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const shouldShow = Boolean(pathname === "/company/dashboard" && ["company", "company_admin"].includes(user?.role) && token);

  useEffect(() => {
    if (!shouldShow) return;

    fetch(`${API_BASE_URL}/company-analytics/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => setPayload(data.status === "success" ? data : null))
      .catch(() => setPayload(null))
      .finally(() => setLoaded(true));
  }, [shouldShow, token]);

  if (!shouldShow || !loaded || !payload?.summary) return null;

  const summary = payload.summary;

  return (
    <aside className="fixed bottom-24 left-4 z-30 hidden w-[390px] rounded-[1.5rem] border border-emerald-100 bg-white p-4 shadow-2xl shadow-slate-900/15 xl:block">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Employer ROI</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Engagement snapshot</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">Aggregated company-level data only</p>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-black text-emerald-700 ring-1 ring-emerald-100">
          {summary.engagement_score}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-blue-50 p-2"><p className="text-lg font-black text-blue-700">{summary.quiz_completion_rate}%</p><p className="text-[10px] font-black uppercase text-blue-700">Quiz</p></div>
        <div className="rounded-2xl bg-violet-50 p-2"><p className="text-lg font-black text-violet-700">{summary.average_readiness_score || 0}</p><p className="text-[10px] font-black uppercase text-violet-700">Avg score</p></div>
        <div className="rounded-2xl bg-amber-50 p-2"><p className="text-lg font-black text-amber-700">{summary.resource_view_count}</p><p className="text-[10px] font-black uppercase text-amber-700">Views</p></div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-red-50 p-2"><p className="text-lg font-black text-red-700">{summary.hot_leads}</p><p className="text-[10px] font-black uppercase text-red-700">Hot</p></div>
        <div className="rounded-2xl bg-amber-50 p-2"><p className="text-lg font-black text-amber-700">{summary.warm_leads}</p><p className="text-[10px] font-black uppercase text-amber-700">Warm</p></div>
        <div className="rounded-2xl bg-slate-100 p-2"><p className="text-lg font-black text-slate-700">{summary.cold_leads}</p><p className="text-[10px] font-black uppercase text-slate-600">Cold</p></div>
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Top employee needs</p>
        <div className="mt-2 space-y-1">
          {summary.top_employee_needs.length > 0 ? summary.top_employee_needs.slice(0, 3).map((need) => (
            <p key={need.label} className="line-clamp-1 text-xs font-bold text-slate-600">• {need.label} <span className="text-slate-400">({need.count})</span></p>
          )) : <p className="text-xs font-bold text-slate-500">Needs will appear after employees submit quizzes.</p>}
        </div>
      </div>
    </aside>
  );
}

export default CompanyROIWidget;