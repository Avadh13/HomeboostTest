import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";

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

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const shouldShow = Boolean((pathname === "/employee-portal" || pathname === "/resources") && user?.role === "employee" && token);

  useEffect(() => {
    if (!shouldShow) return;

    fetch(`${API_BASE_URL}/resource-recommendations/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((payload) => setResources(Array.isArray(payload.resources) ? payload.resources : []))
      .catch(() => setResources([]))
      .finally(() => setLoaded(true));
  }, [shouldShow, token]);

  if (!shouldShow || !loaded || resources.length === 0) return null;

  return (
    <aside className="fixed bottom-24 left-4 z-30 hidden w-[380px] rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-2xl shadow-slate-900/15 xl:block">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Recommended for you</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Personalized resources</h3>
        </div>
        <Link to="/resources" className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">
          All →
        </Link>
      </div>

      <div className="space-y-2">
        {resources.slice(0, 3).map((resource) => (
          <Link key={resource.id} to={`/resources/${resource.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-3 hover:bg-blue-50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="line-clamp-1 font-black text-slate-950">{resource.title}</h4>
                <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{resource.category || "HomeBoost resource"}</p>
              </div>
              <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">
                Match
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-600">
              {resource.recommendation_reason || resource.description || "Recommended based on your HomeBoost profile."}
            </p>
          </Link>
        ))}
      </div>
    </aside>
  );
}

export default RecommendedResourcesWidget;
