import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { useToast } from "../components/ToastProvider";

type Resource = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  resource_type?: string | null;
  resource_url?: string | null;
  image_url?: string | null;
  is_global?: number;
  assigned_partnership_count?: number;
  assigned_partnership_ids?: string | null;
  assigned_partnership_names?: string | null;
};

type Partnership = { id: number; employer_name?: string; company_name?: string; slug?: string };

function parseAssignedIds(value?: string | null) {
  return value ? value.split(",").map(Number).filter(Boolean) : [];
}

function HBTResources() {
  const toast = useToast();
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [resourceType, setResourceType] = useState("article");
  const [resourceUrl, setResourceUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audienceScope, setAudienceScope] = useState<"all" | "selected">("all");
  const [selectedPartnershipIds, setSelectedPartnershipIds] = useState<number[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resourcesRes, partnershipsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/resources`, { headers }),
        fetch(`${API_BASE_URL}/hbt-partnerships`, { headers }),
      ]);
      const resourcesData = await resourcesRes.json();
      const partnershipsData = await partnershipsRes.json();
      setResources(Array.isArray(resourcesData) ? resourcesData : []);
      setPartnerships(Array.isArray(partnershipsData) ? partnershipsData : []);
    } catch {
      toast.error("Could not load resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const teamResources = useMemo(() => resources.filter((r) => Number(r.is_global) !== 1), [resources]);
  const globalResources = useMemo(() => resources.filter((r) => Number(r.is_global) === 1), [resources]);
  const targetedResources = useMemo(() => teamResources.filter((r) => Number(r.assigned_partnership_count || 0) > 0), [teamResources]);
  const visibleResources = useMemo(() => {
    const q = search.toLowerCase().trim();
    return resources.filter((r) => {
      const matchesSearch = !q || [r.title, r.description, r.category, r.resource_type, r.assigned_partnership_names].filter(Boolean).join(" ").toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || r.resource_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [resources, search, typeFilter]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setResourceType("article");
    setResourceUrl("");
    setImageUrl("");
    setAudienceScope("all");
    setSelectedPartnershipIds([]);
  };

  const openCreateDrawer = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    resetForm();
  };

  const startEdit = (resource: Resource) => {
    setEditingId(resource.id);
    setTitle(resource.title || "");
    setDescription(resource.description || "");
    setCategory(resource.category || "");
    setResourceType(resource.resource_type || "article");
    setResourceUrl(resource.resource_url || "");
    setImageUrl(resource.image_url || "");
    const ids = parseAssignedIds(resource.assigned_partnership_ids);
    setSelectedPartnershipIds(ids);
    setAudienceScope(ids.length ? "selected" : "all");
    setDrawerOpen(true);
  };

  const togglePartnership = (id: number) => {
    setSelectedPartnershipIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const audienceLabel = (resource: Resource) => {
    if (Number(resource.is_global) === 1) return "Global admin resource";
    if (Number(resource.assigned_partnership_count || 0) === 0) return "All my partnerships";
    return resource.assigned_partnership_names || "Selected partnerships";
  };

  const submitResource = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.warning("Resource title is required.");
      return;
    }
    if (audienceScope === "selected" && selectedPartnershipIds.length === 0) {
      toast.warning("Select at least one partnership.");
      return;
    }

    try {
      const response = await fetch(editingId ? `${API_BASE_URL}/resources/${editingId}` : `${API_BASE_URL}/resources`, {
        method: editingId ? "PUT" : "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          resource_type: resourceType,
          resource_url: resourceUrl,
          image_url: imageUrl,
          partnership_ids: audienceScope === "selected" ? selectedPartnershipIds : [],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.message || "Resource save failed.");
        return;
      }
      toast.success(editingId ? "Resource updated." : "Resource created.");
      closeDrawer();
      loadData();
    } catch {
      toast.error("Resource save failed.");
    }
  };

  const disableResource = async (resource: Resource) => {
    if (!confirm(`Disable resource: ${resource.title}?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/resources/${resource.id}`, { method: "DELETE", headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.message || "Delete failed.");
        return;
      }
      toast.success("Resource disabled.");
      loadData();
    } catch {
      toast.error("Delete failed.");
    }
  };

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="theme-panel">
          <Link to="/hbt/dashboard" className="text-sm font-black text-violet-200 hover:text-white">← Back to HBT Dashboard</Link>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Resource Command Center</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">HBT Resources</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">Create resources for all partnerships or selected employer groups.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-3xl bg-white/10 p-3 backdrop-blur">
              <div><p className="text-2xl font-black">{teamResources.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Team</p></div>
              <div><p className="text-2xl font-black">{targetedResources.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Targeted</p></div>
              <div><p className="text-2xl font-black">{globalResources.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Global</p></div>
              <div><p className="text-2xl font-black">{partnerships.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Partners</p></div>
            </div>
          </div>
        </header>

        <section className="premium-card overflow-hidden p-0">
          <div className="border-b border-slate-100 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-center">
              <input className="form-field" placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="form-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All types</option>
                <option value="article">Article</option>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="webinar">Webinar</option>
              </select>
              <button onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Create Resource</button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">Loading resources...</div>
          ) : visibleResources.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No resources found.</div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleResources.map((resource) => {
                const isGlobal = Number(resource.is_global) === 1;
                return (
                  <article key={resource.id} className="group overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-36 bg-slate-100">
                      {resource.image_url ? <img src={resource.image_url} alt={resource.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-5xl font-black text-violet-200">▤</div>}
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-slate-600">{resource.resource_type || "article"}</span>
                        {resource.category && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">{resource.category}</span>}
                        {isGlobal && <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase text-white">Read only</span>}
                      </div>
                      <h3 className="mt-3 text-xl font-black text-slate-950">{resource.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{resource.description || "No description"}</p>
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.15em] text-violet-700">Audience: {audienceLabel(resource)}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {resource.resource_url && <a href={resource.resource_url} target="_blank" rel="noreferrer" className="btn-secondary">Open</a>}
                        {!isGlobal && <button onClick={() => startEdit(resource)} className="btn-primary">Edit</button>}
                        {!isGlobal && <button onClick={() => disableResource(resource)} className="btn-danger">Disable</button>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[86vw] xl:w-[980px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">HBT resource editor</p>
                <h2 className="text-2xl font-black">{editingId ? "Edit Resource" : "Create Resource"}</h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.82fr]">
              <form onSubmit={submitResource} className="space-y-4 p-5">
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Title</span><input className="form-field" placeholder="Resource title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Description</span><textarea className="form-field min-h-28" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Category</span><input className="form-field" placeholder="Mortgage / Credit / Planning" value={category} onChange={(e) => setCategory(e.target.value)} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Type</span><select className="form-field" value={resourceType} onChange={(e) => setResourceType(e.target.value)}><option value="article">Article</option><option value="pdf">PDF</option><option value="video">Video</option><option value="link">Link</option><option value="webinar">Webinar</option></select></label>
                </div>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Resource URL</span><input className="form-field" placeholder="https://..." value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Image URL</span><input className="form-field" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></label>
                <div className="rounded-3xl border border-violet-100 bg-violet-50/70 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Audience</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => setAudienceScope("all")} className={`rounded-2xl border p-4 text-left font-bold ${audienceScope === "all" ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>All my partnerships</button>
                    <button type="button" onClick={() => setAudienceScope("selected")} className={`rounded-2xl border p-4 text-left font-bold ${audienceScope === "selected" ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>Selected only</button>
                  </div>
                  {audienceScope === "selected" && <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto pr-1">{partnerships.map((p) => <label key={p.id} className="flex items-center justify-between rounded-2xl bg-white p-3 font-semibold text-slate-700"><span>{p.employer_name || p.company_name || `Partnership #${p.id}`} <span className="text-xs text-slate-400">/{p.slug}</span></span><input type="checkbox" checked={selectedPartnershipIds.includes(p.id)} onChange={() => togglePartnership(p.id)} /></label>)}</div>}
                </div>
                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <button className="btn-primary">{editingId ? "Update Resource" : "Create Resource"}</button>
                  <button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button>
                </div>
              </form>

              <section className="border-l border-slate-200 bg-white p-5">
                <p className="eyebrow">Live preview</p>
                <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
                  <div className="h-56 bg-slate-100">{imageUrl ? <img src={imageUrl} alt="Resource preview" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-5xl font-black text-violet-200">▤</div>}</div>
                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase text-violet-700">{resourceType}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{category || "Category"}</span></div>
                    <h3 className="text-2xl font-black text-slate-950">{title || "Resource title preview"}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{description || "Resource description preview will appear here."}</p>
                    <p className="mt-4 text-xs font-black uppercase tracking-[0.15em] text-violet-700">Audience: {audienceScope === "selected" ? `${selectedPartnershipIds.length} selected` : "All my partnerships"}</p>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

export default HBTResources;
