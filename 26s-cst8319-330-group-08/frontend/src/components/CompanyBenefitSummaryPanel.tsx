import { useEffect, useState } from "react";
import API_BASE_URL from "../api/api";

type Summary = {
  total_requests: number;
  active_requests: number;
  completed_requests: number;
  unique_employees: number;
  by_status: Array<{ status: string; total: number }>;
  by_service: Array<{ service_title: string | null; total: number }>;
};

const emptySummary: Summary = {
  total_requests: 0,
  active_requests: 0,
  completed_requests: 0,
  unique_employees: 0,
  by_status: [],
  by_service: [],
};

const formatLabel = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function CompanyBenefitSummaryPanel() {
  const token = localStorage.getItem("token");
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/company-mortgage/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;
        setSummary(data.summary || emptySummary);
      })
      .catch(() => mounted && setSummary(emptySummary))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Benefit engagement</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Company summary</h2>
            <p className="mt-2 text-sm text-slate-500">Privacy-safe engagement counts for the company manager.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">Company View</span>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-8 text-center font-bold text-slate-500">Loading summary...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["Total Requests", summary.total_requests],
                ["Active", summary.active_requests],
                ["Completed", summary.completed_requests],
                ["Employees Used", summary.unique_employees],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <h3 className="mt-2 text-3xl font-black text-blue-700">{value}</h3>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-5">
                <h3 className="text-lg font-black text-slate-950">By status</h3>
                <div className="mt-4 space-y-2">
                  {summary.by_status.map((item) => <div key={item.status} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-bold"><span>{formatLabel(item.status)}</span><span>{item.total}</span></div>)}
                  {summary.by_status.length === 0 && <p className="text-sm font-bold text-slate-500">No status data yet.</p>}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-5">
                <h3 className="text-lg font-black text-slate-950">Popular services</h3>
                <div className="mt-4 space-y-2">
                  {summary.by_service.map((item) => <div key={item.service_title || "Unknown"} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-bold"><span>{item.service_title || "Unknown"}</span><span>{item.total}</span></div>)}
                  {summary.by_service.length === 0 && <p className="text-sm font-bold text-slate-500">No service data yet.</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default CompanyBenefitSummaryPanel;
