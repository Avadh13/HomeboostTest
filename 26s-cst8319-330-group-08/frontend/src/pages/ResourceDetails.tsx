import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type Resource = {
  id: number;
  title: string;
  description?: string | null;
  content?: string | null;
  category?: string | null;
  resource_type?: string | null;
  image_url?: string | null;
  resource_url?: string | null;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80";

const formatType = (value?: string | null) =>
  String(value || "Resource")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function ResourceDetails() {
  const { id } = useParams();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${API_BASE_URL}/resources/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load resource");
        return response.json();
      })
      .then((data) => setResource(data))
      .catch(() => setResource(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!id || !token || user?.role !== "employee") return;

    fetch(`${API_BASE_URL}/resource-recommendations/${id}/view`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {
      // Engagement tracking must never block the resource page.
    });
  }, [id]);

  return (
    <main className="theme-page min-h-screen overflow-hidden">
      <Navbar />

      <section className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-6xl">
          <Link to="/resources" className="btn-secondary">← Back to Resources</Link>

          {loading ? (
            <div className="loading-state mt-6">
              <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="font-black text-slate-800">Loading resource...</p>
              <p className="mt-2 text-sm text-slate-500">Preparing your HomeBoost guide.</p>
            </div>
          ) : !resource ? (
            <div className="empty-state mt-6">
              <h1 className="text-3xl font-black text-red-600">Resource unavailable</h1>
              <p className="mt-2 text-slate-600">This resource may not be assigned to your employer partnership.</p>
              <Link to="/resources" className="btn-primary mt-6">Browse Resources</Link>
            </div>
          ) : (
            <article className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="relative min-h-[320px] overflow-hidden bg-slate-950 text-white">
                <img
                  src={resource.image_url || fallbackImage}
                  alt={resource.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-55"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-blue-950/75 to-blue-800/65" />

                <div className="relative z-10 flex min-h-[320px] flex-col justify-end p-6 md:p-9">
                  <div className="mb-5 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/90 backdrop-blur">
                      {resource.category || "HomeBoost Resource"}
                    </span>
                    <span className="rounded-lg bg-blue-400/20 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-100 ring-1 ring-blue-200/20">
                      {formatType(resource.resource_type)}
                    </span>
                    <span className="rounded-lg bg-emerald-400/20 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-100 ring-1 ring-emerald-200/20">
                      Recommended Guide
                    </span>
                  </div>

                  <h1 className="max-w-4xl text-3xl font-black tracking-tight md:text-5xl">{resource.title}</h1>
                  {resource.description && (
                    <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/85 md:text-lg">{resource.description}</p>
                  )}

                  <div className="mt-7 flex flex-wrap gap-3">
                    {resource.resource_url && (
                      <a href={resource.resource_url} target="_blank" rel="noreferrer" className="btn-secondary">
                        Open Resource →
                      </a>
                    )}
                    <Link to="/employee/messages" className="btn-primary">Message Advisor</Link>
                    <Link to="/employee/journey" className="rounded-xl border border-white/25 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10">
                      Continue Journey
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-5 md:p-8 lg:grid-cols-[1fr_320px]">
                <div className="rounded-2xl bg-slate-50 p-5 md:p-7">
                  <p className="eyebrow">Resource details</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">What this guide covers</h2>
                  {resource.content ? (
                    <p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-700">{resource.content}</p>
                  ) : (
                    <p className="mt-5 text-base leading-8 text-slate-700">
                      This resource is part of your HomeBoost employee benefit library. Use it to prepare for your next step, then message your assigned Home Buying Team when you need guidance.
                    </p>
                  )}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="eyebrow">Next steps</p>
                    <div className="mt-4 space-y-3">
                      <Link to="/quiz" className="block rounded-xl bg-blue-50 p-4 text-sm font-black text-blue-700 hover:bg-blue-100">Take readiness quiz →</Link>
                      <Link to="/resources" className="block rounded-xl bg-slate-50 p-4 text-sm font-black text-slate-700 hover:bg-slate-100">View all resources →</Link>
                      <Link to="/employee/messages" className="block rounded-xl bg-slate-950 p-4 text-sm font-black text-white hover:bg-blue-700">Message your advisor →</Link>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-5 text-sm leading-relaxed text-emerald-800 ring-1 ring-emerald-100">
                    <p className="font-black">Engagement tracked</p>
                    <p className="mt-2 font-semibold">This resource view helps HomeBoost measure benefit usage at the company level without exposing private quiz answers.</p>
                  </div>
                </aside>
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}

export default ResourceDetails;
