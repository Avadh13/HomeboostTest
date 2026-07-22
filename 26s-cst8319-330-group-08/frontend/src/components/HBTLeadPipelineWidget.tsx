import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { readStoredToken, readStoredUser } from "../utils/auth";

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
  const user = readStoredUser();
  const token = readStoredToken();
  const shouldShow = Boolean(
    pathname === "/hbt/member-dashboard" &&
      ["hbt_admin", "hbt_member", "admin", "super_admin"].includes(String(user?.role || "")) &&
      token,
  );

  useEffect(() => {
    setLoaded(false);
    if (!shouldShow || !token) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/lead-pipeline`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Failed to load lead pipeline");
        setLeads(Array.isArray(payload.leads) ? payload.leads : []);
      } catch {
        if (!controller.signal.aborted) setLeads([]);
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    };

    load();
    return () => controller.abort();
  }, [shouldShow, token]);

  const stats = useMemo(
    () => ({
      hot: leads.filter((lead) => lead.priority === "hot").length,
      overdue: leads.filter((lead) => lead.is_overdue).length,
      open: leads.filter((lead) => !["closed", "not_interested"].includes(lead.stage)).length,
    }),
    [leads],
  );

  if (!shouldShow || !loaded || leads.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6">
      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-lg shadow-slate-200/60">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Smart lead pipeline</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Hot mortgage follow-ups</h3>
          </div>
          <Link to="/hbt/quiz-submissions" className="btn-secondary text-xs">Open queue →</Link>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-red-50 p-3 text-center"><p className="text-2xl font-black text-red-700">{stats.hot}</p><p className="text-[10px] font-black uppercase text-red-700">Hot</p></div>
          <div className="rounded-2xl bg-amber-50 p-3 text-center"><p className="text-2xl font-black text-amber-700">{stats.overdue}</p><p className="text-[10px] font-black uppercase text-amber-700">Due</p></div>
          <div className="rounded-2xl bg-blue-50 p-3 text-center"><p className="text-2xl font-black text-blue-700">{stats.open}</p><p className="text-[10px] font-black uppercase text-blue-700">Open</p></div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {leads.slice(0, 3).map((lead) => (
            <Link key={lead.id} to="/hbt/quiz-submissions" className="block min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-violet-200 hover:bg-violet-50">
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
              {lead.next_action && <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-600">{lead.next_action}</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HBTLeadPipelineWidget;
