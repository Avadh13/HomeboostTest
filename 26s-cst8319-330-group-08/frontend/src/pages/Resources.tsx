import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";
import { useToast } from "../components/ToastProvider";

type Resource = {
  id: number;
  title: string;
  description: string;
  category: string;
  resource_type?: string;
  type?: string;
  resource_url?: string;
  url?: string;
  image_url?: string;
  is_bookmarked?: boolean;
  in_journey?: boolean;
};

type ViewFilter = "all" | "journey" | "saved";

const fallbackImages = [
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&q=80",
];

function Resources() {
  const toast = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const token = localStorage.getItem("token");

  const loadResources = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/resources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to load resources.");
        setResources([]);
        return;
      }
      setResources(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load resources:", error);
      toast.error("Failed to load resources.");
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (resource: Resource) => {
    try {
      const method = resource.is_bookmarked ? "DELETE" : "POST";
      const response = await fetch(`${API_BASE_URL}/resources/${resource.id}/bookmark`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not update saved resource");
      setResources((current) =>
        current.map((item) =>
          item.id === resource.id
            ? { ...item, is_bookmarked: !resource.is_bookmarked }
            : item,
        ),
      );
      toast.success(resource.is_bookmarked ? "Removed from saved resources." : "Saved resource.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update saved resource.");
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const categories = useMemo(
    () => [...new Set(resources.map((resource) => resource.category).filter(Boolean))].sort(),
    [resources],
  );
  const types = useMemo(
    () => [...new Set(resources.map((resource) => resource.resource_type || resource.type).filter(Boolean))].sort(),
    [resources],
  );
  const journeyCount = resources.filter((resource) => resource.in_journey).length;
  const savedCount = resources.filter((resource) => resource.is_bookmarked).length;

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resources.filter((resource) => {
      const resourceType = resource.resource_type || resource.type || "article";
      const matchesSearch =
        !query ||
        [resource.title, resource.description, resource.category, resourceType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesCategory = categoryFilter === "all" || resource.category === categoryFilter;
      const matchesType = typeFilter === "all" || resourceType === typeFilter;
      const matchesView =
        viewFilter === "all" ||
        (viewFilter === "journey" && resource.in_journey) ||
        (viewFilter === "saved" && resource.is_bookmarked);
      return matchesSearch && matchesCategory && matchesType && matchesView;
    });
  }, [categoryFilter, resources, search, typeFilter, viewFilter]);

  return (
    <main className="theme-page min-h-screen">
      <Navbar />

      <section className="px-4 py-7 md:px-6 md:py-9">
        <div className="section-container space-y-5">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow">Employee Resource Library</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Resources</h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">
                  Browse guides, checklists, videos, and planning tools selected for your home-buying journey.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/employee/journey" className="btn-secondary">View Journey</Link>
                <Link to="/quiz" className="btn-secondary">Take Quiz</Link>
                <Link to="/employee/messages" className="btn-primary">Message Advisor</Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-4">
            {[
              ["Total Resources", resources.length, "bg-blue-50 text-blue-700"],
              ["In My Journey", journeyCount, "bg-indigo-50 text-indigo-700"],
              ["Saved", savedCount, "bg-emerald-50 text-emerald-700"],
              ["Showing", filteredResources.length, "bg-amber-50 text-amber-700"],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="metric-card">
                <div className={`inline-flex rounded-xl px-3 py-2 text-2xl font-black ${tone}`}>{value}</div>
                <p className="mt-3 text-sm font-black text-slate-800">{label}</p>
              </div>
            ))}
          </section>

          <section className="premium-card space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All Resources"],
                ["journey", "My Journey"],
                ["saved", "Saved"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setViewFilter(value as ViewFilter)}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                    viewFilter === value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_210px_190px_auto] md:items-center">
              <input
                className="form-field"
                placeholder="Search resources..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select className="form-field" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select className="form-field" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">All types</option>
                {types.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <button type="button" onClick={loadResources} className="btn-secondary whitespace-nowrap">Refresh</button>
            </div>
          </section>

          {loading ? (
            <section className="loading-state p-8 text-center">
              <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="font-black text-slate-700">Loading resources...</p>
            </section>
          ) : filteredResources.length === 0 ? (
            <section className="empty-state p-10 text-center">
              <h2 className="text-2xl font-black text-slate-950">No resources found</h2>
              <p className="mx-auto mt-2 max-w-xl text-slate-600">Try clearing the filters or message your advisor for guidance.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                    setTypeFilter("all");
                    setViewFilter("all");
                  }}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
                <Link to="/employee/messages" className="btn-primary">Message Advisor</Link>
              </div>
            </section>
          ) : (
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map((resource, index) => {
                const resourceType = resource.resource_type || resource.type || "article";
                return (
                  <Link
                    key={resource.id}
                    to={`/resources/${resource.id}`}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        toggleBookmark(resource);
                      }}
                      className={`absolute right-4 top-4 z-10 rounded-lg px-3 py-1.5 text-xs font-black shadow-sm ${
                        resource.is_bookmarked
                          ? "bg-emerald-600 text-white"
                          : "bg-white/95 text-slate-700"
                      }`}
                    >
                      {resource.is_bookmarked ? "Saved" : "Save"}
                    </button>

                    <div className="relative h-44 bg-slate-100">
                      <img
                        src={resource.image_url || fallbackImages[index % fallbackImages.length]}
                        alt={resource.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
                        {resource.in_journey && <span className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-black uppercase text-white">Journey</span>}
                        {resource.category && <span className="rounded-lg bg-white/95 px-3 py-1 text-xs font-black uppercase text-blue-700">{resource.category}</span>}
                        <span className="rounded-lg bg-slate-950/85 px-3 py-1 text-xs font-black uppercase text-white">{resourceType}</span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h2 className="text-xl font-black text-slate-950">{resource.title}</h2>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{resource.description || "Open this resource for more guidance."}</p>
                      <p className="mt-5 text-sm font-black text-blue-700">View Details →</p>
                    </div>
                  </Link>
                );
              })}
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="eyebrow">Personalized help</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">Need help choosing the next resource?</h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">Use your journey, take the readiness quiz, or message your Home Buying Team for the next best step.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/employee/journey" className="btn-secondary">Open Journey</Link>
                <Link to="/employee/messages" className="btn-primary">Message Advisor</Link>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default Resources;
