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
  team_id?: number | null;
  assigned_partnership_count?: number;
  assigned_partnership_ids?: string | null;
  assigned_partnership_names?: string | null;
};

type Partnership = {
  id: number;
  employer_name?: string;
  company_name?: string;
  slug?: string;
};

function parseAssignedIds(value?: string | null) {
  if (!value) return [];
  return value.split(",").map((item) => Number(item)).filter(Boolean);
}

function HBTResources() {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [resources, setResources] = useState<Resource[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
    } catch (error) {
      console.error("Failed to load HBT resources:", error);
      setNotice({ type: "error", message: "Could not load resources." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const ownResources = useMemo(() => resources.filter((item) => Number(item.is_global) !== 1), [resources]);
  const globalResources = useMemo(() => resources.filter((item) => Number(item.is_global) === 1), [resources]);

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

    const assignedIds = parseAssignedIds(resource.assigned_partnership_ids);
    setSelectedPartnershipIds(assignedIds);
    setAudienceScope(assignedIds.length > 0 ? "selected" : "all");
  };

  const togglePartnership = (id: number) => {
    setSelectedPartnershipIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const submitResource = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (!title.trim()) {
      setNotice({ type: "error", message: "Resource title is required." });
      return;
    }

    if (audienceScope === "selected" && selectedPartnershipIds.length === 0) {
      setNotice({ type: "error", message: "Select at least one partnership or choose all partnerships." });
      return;
    }

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
      setNotice({ type: "error", message: data.message || "Resource save failed." });
      return;
    }

    setNotice({ type: "success", message: editingId ? "Resource updated." : "Resource created." });
    resetForm();
    await loadData();
  };

  const deleteResource = async (resource: Resource) => {
    if (!confirm(`Disable resource: ${resource.title}?`)) return;

    const response = await fetch(`${API_BASE_URL}/resources/${resource.id}`, {
      method: "DELETE",
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setNotice({ type: "error", message: data.message || "Delete failed." });
      return;
    }

    setNotice({ type: "success", message: "Resource disabled." });
    await loadData();
  };

  const renderAudience = (resource: Resource) => {
    if (Number(resource.is_global) === 1) return "Global admin resource";
    if (Number(resource.assigned_partnership_count || 0) === 0) return "All my partnerships";
    return resource.assigned_partnership_names || "Selected partnerships";
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-blue-950 p-8 text-white shadow-xl">
          <Link to="/hbt/dashboard" className="text-sm font-bold text-blue-200 hover:text-white">← Back to HBT Dashboard</Link>
          <h1 className="mt-4 text-4xl font-black">HBT Resources</h1>
          <p className="mt-3 max-w-3xl text-blue-100">Create resources for all partnerships under your HBT team or assign resources to selected employer partnerships only.</p>
        </header>

        {notice && (
          <div className={`rounded-2xl border px-5 py-4 font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {notice.message}
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={submitResource} className="rounded-[2rem] bg-white p-7 shadow-xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Content Manager</p>
            <h2 className="mt-2 text-3xl font-black">{editingId ? "Edit Resource" : "Create Resource"}</h2>

            <div className="mt-6 space-y-4">
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" placeholder="Resource title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
              <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
                <option value="article">Article</option>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="webinar">Webinar</option>
              </select>
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" placeholder="Resource URL" value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} />
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">Audience</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setAudienceScope("all")} className={`rounded-2xl border p-4 text-left font-bold ${audienceScope === "all" ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>All my partnerships</button>
                  <button type="button" onClick={() => setAudienceScope("selected")} className={`rounded-2xl border p-4 text-left font-bold ${audienceScope === "selected" ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>Selected partnerships only</button>
                </div>

                {audienceScope === "selected" && (
                  <div className="mt-4 space-y-2">
                    {partnerships.map((partnership) => (
                      <label key={partnership.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 font-semibold text-slate-700">
                        <input type="checkbox" checked={selectedPartnershipIds.includes(partnership.id)} onChange={() => togglePartnership(partnership.id)} />
                        {partnership.employer_name || partnership.company_name || `Partnership #${partnership.id}`}
                        <span className="text-xs text-slate-400">/{partnership.slug}</span>
                      </label>
                    ))}
                    {partnerships.length === 0 && <p className="text-sm text-slate-500">No partnerships found for your HBT team.</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-full bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700">{editingId ? "Update Resource" : "Create Resource"}</button>
              {editingId && <button type="button" onClick={resetForm} className="rounded-full bg-slate-200 px-6 py-3 font-black text-slate-700 hover:bg-slate-300">Cancel Edit</button>}
            </div>
          </form>

          <section className="rounded-[2rem] bg-white p-7 shadow-xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">My HBT Content</p>
            <h2 className="mt-2 text-3xl font-black">Team resources</h2>

            {loading ? (
              <p className="mt-6 text-slate-500">Loading resources...</p>
            ) : ownResources.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-slate-500">No HBT resources created yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {ownResources.map((resource) => (
                  <article key={resource.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-slate-950">{resource.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">{resource.description}</p>
                        <p className="mt-3 text-xs font-black uppercase tracking-[0.15em] text-blue-700">Audience: {renderAudience(resource)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(resource)} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white">Edit</button>
                        <button onClick={() => deleteResource(resource)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white">Disable</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>

        {globalResources.length > 0 && (
          <section className="rounded-[2rem] bg-white p-7 shadow-xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Read only</p>
            <h2 className="text-2xl font-black text-slate-950">Global admin resources visible to your employees</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {globalResources.map((resource) => (
                <div key={resource.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <h3 className="font-black text-slate-950">{resource.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{resource.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default HBTResources;
