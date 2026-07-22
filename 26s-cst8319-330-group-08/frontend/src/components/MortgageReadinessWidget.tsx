import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";

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

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const shouldShow = Boolean(pathname === "/employee-portal" && user?.role === "employee" && token);

  useEffect(() => {
    if (!shouldShow) return;

    fetch(`${API_BASE_URL}/readiness/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((payload) => {
        setReadiness(payload.readiness || null);
        setRecommendations(Array.isArray(payload.recommendations) ? payload.recommendations : []);
      })
      .catch(() => {
        setReadiness(null);
        setRecommendations([]);
      })
      .finally(() => setLoaded(true));
  }, [shouldShow, token]);

  if (!shouldShow || !loaded) return null;

  if (!readiness) {
    return (
      <aside className="fixed bottom-24 right-4 z-30 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-blue-100 bg-white p-4 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Mortgage readiness</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">Get your readiness score</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Complete a readiness quiz to unlock a score, priority level, and next steps.</p>
        <Link to="/quiz" className="btn-primary mt-4">Take quiz →</Link>
      </aside>
    );
  }

  const score = Number(readiness.score || 0);

  return (
    <aside className="fixed bottom-24 right-4 z-30 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Mortgage readiness</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{readiness.level}</h3>
        </div>
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border text-xl font-black ${scoreTone(score)}`}>
          {score}
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
        {readiness.lead_next_action || readiness.summary || "Review your recommended next steps."}
      </p>

      {recommendations[0] && (
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold leading-relaxed text-slate-600">
          {recommendations[0].recommendation_text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/employee/messages" className="btn-primary text-xs">Message advisor</Link>
        <Link to="/resources" className="btn-secondary text-xs">Resources</Link>
      </div>
    </aside>
  );
}

export default MortgageReadinessWidget;
