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
      const response = await fetch(`${API_BASE_URL}/resources`, { headers: { Authorization: `Bearer ${token}` } });
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
      const response = await fetch(`${API_BASE_URL}/resources/${resource.id}/bookmark`, { method, headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not update saved resource");
      setResources((current) => current.map((item) => item.id === resource.id ? { ...item, is_bookmarked: !resource.is_bookmarked } : item));
      toast.success(resource.is_bookmarked ? "Removed from saved resources." : "Saved resource.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update saved resource.");
    }
  };

  useEffect(() => { loadResources(); }, []);

  const categories = useMemo(() => [...new Set(resources.map((resource) => resource.category).filter(Boolean))].sort(), [resources]);
  const types = useMemo(() => [...new Set(resources.map((resource) => resource.resource_type || resource.type).filter(Boolean))].sort(), [resources]);
  const journeyCount = resources.filter((resource) => resource.in_journey).length;
  const savedCount = resources.filter((resource) => resource.is_bookmarked).length;

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resources.filter((resource) => {
      const resourceType = resource.resource_type || resource.type || "article";
      const matchesSearch = !query || [resource.title, resource.description, resource.category, resourceType].filter(Boolean).join(" ").toLowerCase().includes(query);
      const matchesCategory = categoryFilter === "all" || resource.category === categoryFilter;
      const matchesType = typeFilter === "all" || resourceType === typeFilter;
      const matchesView = viewFilter === "all" || (viewFilter === "journey" && resource.in_journey) || (viewFilter === "saved" && resource.is_bookmarked);
      return matchesSearch && matchesCategory && matchesType && matchesView;
    });
  }, [categoryFilter, resources, search, typeFilter, viewFilter]);

  return (
    <main className="theme-page min-h-screen">
      <Navbar />
      <section className="relative px-4 py-10 md:px-6 md:py-14">
        <div className="floating-orb -left-24 top-16 h-72 w-72 bg-blue-400" />
        <div className="floating-orb right-0 top-36 h-80 w-80 bg-violet-400" />
        <div className="section-container space-y-5">
          <header className="theme-panel text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Employee Resource Library</p>
            <h1 className="mx-auto mt-3 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">Your home-buying guidance hub</h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-lg">Explore journey resources, saved guides, checklists, videos, articles, and tools assigned to your employer benefit program.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/employee/journey" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-violet-800 hover:bg-violet-50">View journey</Link>
              <Link to="/quiz" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Take readiness quiz</Link>
              <Link to="/employee/messages" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Ask an advisor</Link>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-4">
            {[["Total", resources.length, "text-violet-700", "bg-violet-50"], ["Journey", journeyCount, "text-blue-700", "bg-blue-50"], ["Saved", savedCount, "text-emerald-700", "bg-emerald-50"], ["Showing", filteredResources.length, "text-amber-700", "bg-amber-50"]].map(([label, value, textTone, bgTone]) => (
              <div key={label} className="metric-card"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><h2 className={`mt-2 rounded-2xl px-3 py-2 text-3xl font-black ${textTone} ${bgTone}`}>{value}</h2></div>
            ))}
          </section>

          <section className="premium-card space-y-4 p-4">
            <div className="flex flex-wrap gap-2">
              {[["all", "All resources"], ["journey", "My journey"], ["saved", "Saved"]].map(([value, label]) => (
                <button key={value} onClick={() => setViewFilter(value as ViewFilter)} className={`rounded-full px-4 py-2 text-sm font-black transition ${viewFilter === value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}>{label}</button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_200px_180px_auto] md:items-center">
              <input className="form-field" placeholder="Search resources, category, type..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <select className="form-field" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
              <select className="form-field" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select>
              <button onClick={loadResources} className="btn-secondary whitespace-nowrap">Refresh</button>
            </div>
          </section>

          {loading ? (
            <section className="premium-card p-8 text-center"><div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /><p className="font-black text-slate-700">Loading resources...</p></section>
          ) : filteredResources.length === 0 ? (
            <section className="premium-card p-10 text-center"><h2 className="text-2xl font-black text-slate-950">No resources found</h2><p className="mx-auto mt-2 max-w-xl text-slate-600">Try clearing filters, checking all resources, or contact your advisor.</p><div className="mt-6 flex justify-center gap-3"><button onClick={() => { setSearch(""); setCategoryFilter("all"); setTypeFilter("all"); setViewFilter("all"); }} className="btn-secondary">Clear filters</button><Link to="/employee/messages" className="btn-primary">Message advisor</Link></div></section>
          ) : (
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map((resource, index) => {
                const resourceType = resource.resource_type || resource.type || "article";
                return (
                  <Link key={resource.id} to={`/resources/${resource.id}`} className="group relative overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-lg shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl">
                    <button onClick={(event) => { event.preventDefault(); toggleBookmark(resource); }} className={`absolute right-4 top-4 z-10 rounded-full px-3 py-1.5 text-xs font-black shadow-lg ${resource.is_bookmarked ? "bg-emerald-600 text-white" : "bg-white/90 text-slate-700"}`}>{resource.is_bookmarked ? "Saved" : "Save"}</button>
                    <div className="relative h-48 bg-slate-100">
                      <img src={resource.image_url || fallbackImages[index % fallbackImages.length]} alt={resource.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
                        {resource.in_journey && <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black uppercase text-white shadow-sm">Journey</span>}
                        {resource.category && <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase text-blue-700 shadow-sm backdrop-blur">{resource.category}</span>}
                        <span className="rounded-full bg-slate-950/85 px-3 py-1 text-xs font-black uppercase text-white backdrop-blur">{resourceType}</span>
                      </div>
                    </div>
                    <div className="p-5"><h2 className="text-xl font-black text-slate-950">{resource.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{resource.description || "Open this resource for more guidance."}</p><p className="mt-5 text-sm font-black text-violet-700">View details →</p></div>
                  </Link>
                );
              })}
            </section>
          )}

          <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
            <div className="grid gap-0 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="p-8 md:p-10"><p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Personalized help</p><h2 className="mt-3 text-3xl font-black md:text-4xl">Find the right resource faster</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 md:text-base">Use your journey filter, save important resources, take the readiness quiz, or message an advisor to connect your goals with the right guides.</p></div>
              <div className="flex flex-wrap gap-3 px-8 pb-8 lg:px-10 lg:pb-0"><Link to="/employee/journey" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-slate-100">Open Journey</Link><Link to="/employee/appointments" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Book Appointment</Link></div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default Resources;
