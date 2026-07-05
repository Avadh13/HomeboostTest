import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";

type Lead = {
  id: number;
  employee_name: string;
  employee_email: string;
  company_name?: string;
  stage: string;
  priority: "hot" | "warm" | "cold";
  readiness_score?: number | null;
  readiness_level?: string | null;
  next_action?: string | null;
  follow_up_due_at?: string | null;
  is_overdue?: boolean;
};

const priorityClass = (priority?: string) => {
  if (priority === "hot") return "bg-red-100 text-red-700";
  if (priority === "warm") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
};

const humanStage = (stage?: string) =>
  String(stage || "new_lead")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

function HBTLeadPipelineWidget() {
  const { pathname } = useLocation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const shouldShow = pathname === "/hbt/member-dashboard" && ["hbt_admin", "hbt_member", "admin", "super_admin"].includes(user?.role) && token;

  useEffect(() => {
    if (!shouldShow) return;

    fetch(`${API_BASE_URL}/lead-pipeline`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((payload) => setLeads(Array.isArray(payload.leads) ? payload.leads : []))
      .catch(() => setLeads([]))
      .finally(() => setLoaded(true));
  }, [shouldShow, token]);

  const stats = useMemo(() => {
    return {
      hot: leads.filter((lead) => lead.priority === "hot").length,
      overdue: leads.filter((lead) => lead.is_overdue).length,
      open: leads.filter((lead) => !["closed", "not_interested"].includes(lead.stage)).length,
    };
  }, [leads]);

  if (!shouldShow || !loaded || leads.length === 0) return null;

  const topLeads = leads.slice(0, 3);

  return (
    <aside className="fixed bottom-24 right-4 z-30 hidden w-[380px] rounded-[1.5rem] border border-violet-100 bg-white p-4 shadow-2xl shadow-slate-900/15 xl:block">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Smart lead pipeline</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Hot mortgage follow-ups</h3>
        </div>
        <Link to="/hbt/quiz-submissions" className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-violet-700">
          Queue →
        </Link>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-red-50 p-2"><p className="text-lg font-black text-red-700">{stats.hot}</p><p className="text-[10px] font-black uppercase text-red-700">Hot</p></div>
        <div className="rounded-2xl bg-amber-50 p-2"><p className="text-lg font-black text-amber-700">{stats.overdue}</p><p className="text-[10px] font-black uppercase text-amber-700">Due</p></div>
        <div className="rounded-2xl bg-blue-50 p-2"><p className="text-lg font-black text-blue-700">{stats.open}</p><p className="text-[10px] font-black uppercase text-blue-700">Open</p></div>
      </div>

      <div className="space-y-2">
        {topLeads.map((lead) => (
          <Link key={lead.id} to="/hbt/quiz-submissions" className="block rounded-2xl border border-slate-100 bg-slate-50 p-3 hover:bg-violet-50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="truncate font-black text-slate-950">{lead.employee_name}</h4>
                <p className="truncate text-xs font-semibold text-slate-500">{lead.company_name || lead.employee_email}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${priorityClass(lead.priority)}`}>{lead.priority}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
              <span>{humanStage(lead.stage)}</span>
              {lead.readiness_score !== null && lead.readiness_score !== undefined && <span>• Score {lead.readiness_score}</span>}
              {lead.is_overdue && <span className="text-red-700">• overdue</span>}
            </div>
            {lead.next_action && <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-600">{lead.next_action}</p>}
          </Link>
        ))}
      </div>
    </aside>
  );
}

export default HBTLeadPipelineWidget;
