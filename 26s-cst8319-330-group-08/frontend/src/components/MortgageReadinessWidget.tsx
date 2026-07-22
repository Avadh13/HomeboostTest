import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { readStoredToken, readStoredUser } from "../utils/auth";

type Readiness = {
  score: number;
  level: string;
  priority?: string;
  summary?: string;
  lead_stage?: string;
  lead_next_action?: string;
};

type Recommendation = {
  id: number;
  recommendation_text: string;
};

const scoreTone = (score: number) => {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-100";
  if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-100";
  if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-100";
  return "text-red-700 bg-red-50 border-red-100";
};

function MortgageReadinessWidget() {
  const { pathname } = useLocation();
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const user = readStoredUser();
  const token = readStoredToken();
  const shouldShow = Boolean(pathname === "/employee-portal" && user?.role === "employee" && token);

  useEffect(() => {
    setLoaded(false);
    if (!shouldShow || !token) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/readiness/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Failed to load readiness");
        setReadiness(payload.readiness || null);
        setRecommendations(Array.isArray(payload.recommendations) ? payload.recommendations : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setReadiness(null);
        setRecommendations([]);
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    };

    load();
    return () => controller.abort();
  }, [shouldShow, token]);

  if (!shouldShow || !loaded) return null;

  if (!readiness) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-lg shadow-slate-200/60 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Mortgage readiness</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Get your readiness score</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Complete a readiness quiz to unlock a score, priority level, and recommended next steps.
            </p>
          </div>
          <Link to="/quiz" className="btn-primary mt-4 shrink-0 md:mt-0">Take quiz →</Link>
        </div>
      </section>
    );
  }

  const score = Number(readiness.score || 0);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Mortgage readiness</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{readiness.level}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {readiness.lead_next_action || readiness.summary || "Review your recommended next steps."}
            </p>
            {recommendations[0] && (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold leading-relaxed text-slate-600">
                {recommendations[0].recommendation_text}
              </p>
            )}
          </div>
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border text-2xl font-black ${scoreTone(score)}`}>
            {score}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/employee/messages" className="btn-primary text-xs">Message advisor</Link>
          <Link to="/resources" className="btn-secondary text-xs">Resources</Link>
        </div>
      </div>
    </section>
  );
}

export default MortgageReadinessWidget;
