import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

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
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const [resources, setResources] = useState<Resource[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [search, setSearch] = useState("");
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
      setNotice({ type: "error", message: "Could not load resources." });
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
    if (!q) return resources;
    return resources.filter((r) => [r.title, r.description, r.category, r.resource_type, r.assigned_partnership_names].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [resources, search]);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setNotice(null);
    if (!title.trim()) return setNotice({ type: "error", message: "Resource title is required." });
    if (audienceScope === "selected" && selectedPartnershipIds.length === 0) return setNotice({ type: "error", message: "Select at least one partnership." });

    const response = await fetch(editingId ? `${API_BASE_URL}/resources/${editingId}` : `${API_BASE_URL}/resources`, {
      method: editingId ? "PUT" : "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, resource_type: resourceType, resource_url: resourceUrl, image_url: imageUrl, partnership_ids: audienceScope === "selected" ? selectedPartnershipIds : [] }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setNotice({ type: "error", message: data.message || "Resource save failed." });
    setNotice({ type: "success", message: editingId ? "Resource updated." : "Resource created." });
    resetForm();
    loadData();
  };

  const disableResource = async (resource: Resource) => {
    if (!confirm(`Disable resource: ${resource.title}?`)) return;
    const response = await fetch(`${API_BASE_URL}/resources/${resource.id}`, { method: "DELETE", headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setNotice({ type: "error", message: data.message || "Delete failed." });
    setNotice({ type: "success", message: "Resource disabled." });
    loadData();
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-8 text-white shadow-2xl md:p-10">
          <Link to="/hbt/dashboard" className="text-sm font-bold text-blue-200 hover:text-white">← Back to HBT Dashboard</Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-300">Resource Command Center</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">HBT Resources</h1>
              <p className="mt-4 max-w-3xl text-lg text-blue-100">Create resources for all partnerships or selected employer groups.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-3xl bg-white/10 p-4 backdrop-blur">
              <div><p className="text-3xl font-black">{teamResources.length}</p><p className="text-xs font-bold uppercase text-blue-100">Team</p></div>
              <div><p className="text-3xl font-black">{targetedResources.length}</p><p className="text-xs font-bold uppercase text-blue-100">Targeted</p></div>
              <div><p className="text-3xl font-black">{partnerships.length}</p><p className="text-xs font-bold uppercase text-blue-100">Partners</p></div>
            </div>
          </div>
        </header>

        {notice && <div className={`rounded-2xl border px-5 py-4 font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.message}</div>}

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={submitResource} className="rounded-[2.5rem] bg-white p-7 shadow-2xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Content Manager</p>
            <h2 className="mt-2 text-3xl font-black">{editingId ? "Edit Resource" : "Create Resource"}</h2>
            <div className="mt-6 space-y-4">
              <input className="w-full rounded-2xl border bg-slate-50 p-4" placeholder="Resource title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea className="min-h-28 w-full rounded-2xl border bg-slate-50 p-4" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="grid gap-4 sm:grid-cols-2"><input className="rounded-2xl border bg-slate-50 p-4" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} /><select className="rounded-2xl border bg-slate-50 p-4" value={resourceType} onChange={(e) => setResourceType(e.target.value)}><option value="article">Article</option><option value="pdf">PDF</option><option value="video">Video</option><option value="link">Link</option><option value="webinar">Webinar</option></select></div>
              <input className="w-full rounded-2xl border bg-slate-50 p-4" placeholder="Resource URL" value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} />
              <input className="w-full rounded-2xl border bg-slate-50 p-4" placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5"><p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">Audience</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setAudienceScope("all")} className={`rounded-2xl border p-4 text-left font-bold ${audienceScope === "all" ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>All my partnerships</button><button type="button" onClick={() => setAudienceScope("selected")} className={`rounded-2xl border p-4 text-left font-bold ${audienceScope === "selected" ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>Selected only</button></div>{audienceScope === "selected" && <div className="mt-4 grid gap-2">{partnerships.map((p) => <label key={p.id} className="flex items-center justify-between rounded-2xl bg-white p-3 font-semibold text-slate-700"><span>{p.employer_name || p.company_name || `Partnership #${p.id}`} <span className="text-xs text-slate-400">/{p.slug}</span></span><input type="checkbox" checked={selectedPartnershipIds.includes(p.id)} onChange={() => togglePartnership(p.id)} /></label>)}</div>}</div>
              <div className="flex flex-wrap gap-3"><button className="rounded-full bg-blue-600 px-7 py-3 font-black text-white hover:bg-blue-700">{editingId ? "Update Resource" : "Create Resource"}</button>{editingId && <button type="button" onClick={resetForm} className="rounded-full bg-slate-200 px-7 py-3 font-black text-slate-700">Cancel</button>}</div>
            </div>
          </form>

          <section className="rounded-[2.5rem] bg-white p-7 shadow-2xl">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Library</p><h2 className="mt-2 text-3xl font-black">Team resource library</h2><p className="mt-2 text-sm text-slate-500">Search, edit, and review audiences.</p></div><button onClick={loadData} className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700">Refresh</button></div>
            <input className="mt-6 w-full rounded-2xl border bg-slate-50 p-3" placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {loading ? <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-slate-500">Loading resources...</p> : <div className="mt-6 grid gap-4">{visibleResources.map((resource) => { const isGlobal = Number(resource.is_global) === 1; return <article key={resource.id} className="rounded-3xl border bg-slate-50 p-5 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-slate-600">{resource.resource_type || "article"}</span>{resource.category && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">{resource.category}</span>}{isGlobal && <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase text-white">Read only</span>}</div><h3 className="mt-3 text-xl font-black">{resource.title}</h3><p className="mt-2 text-sm text-slate-600">{resource.description}</p><p className="mt-3 text-xs font-black uppercase tracking-[0.15em] text-blue-700">Audience: {audienceLabel(resource)}</p></div>{!isGlobal && <div className="flex gap-2"><button onClick={() => startEdit(resource)} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white">Edit</button><button onClick={() => disableResource(resource)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white">Disable</button></div>}</div></article>; })}</div>}
          </section>
        </section>
      </div>
    </main>
  );
}

export default HBTResources;
