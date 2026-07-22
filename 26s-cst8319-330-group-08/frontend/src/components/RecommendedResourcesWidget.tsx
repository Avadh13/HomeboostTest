import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { readStoredToken, readStoredUser } from "../utils/auth";

type RecommendedResource = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  recommendation_reason?: string | null;
  recommendation_score?: number;
};

function RecommendedResourcesWidget() {
  const { pathname } = useLocation();
  const [resources, setResources] = useState<RecommendedResource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const user = readStoredUser();
  const token = readStoredToken();
  const shouldShow = Boolean(
    (pathname === "/employee-portal" || pathname === "/resources") &&
      user?.role === "employee" &&
      token,
  );

  useEffect(() => {
    setLoaded(false);
    if (!shouldShow || !token) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/resource-recommendations/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Failed to load recommendations");
        setResources(Array.isArray(payload.resources) ? payload.resources : []);
      } catch {
        if (!controller.signal.aborted) setResources([]);
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    };

    load();
    return () => controller.abort();
  }, [shouldShow, token]);

  if (!shouldShow || !loaded || resources.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-lg shadow-slate-200/60">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Recommended for you</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Personalized resources</h3>
          </div>
          <Link to="/resources" className="btn-secondary text-xs">View all →</Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {resources.slice(0, 3).map((resource) => (
            <Link
              key={resource.id}
              to={`/resources/${resource.id}`}
              className="block min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="line-clamp-1 font-black text-slate-950">{resource.title}</h4>
                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{resource.category || "HomeBoost resource"}</p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">Match</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-600">
                {resource.recommendation_reason || resource.description || "Recommended based on your HomeBoost profile."}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RecommendedResourcesWidget;
