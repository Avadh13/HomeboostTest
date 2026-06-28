import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type Resource = {
  id: number;
  title: string;
  description: string;
  category: string;
  resource_type: string;
  resource_url: string;
  image_url?: string;
};

function ManageResources() {
  const toast = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [resourceType, setResourceType] = useState("article");
  const [resourceUrl, setResourceUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const categories = useMemo(() => {
    return [...new Set(resources.map((resource) => resource.category).filter(Boolean))].sort();
  }, [resources]);

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesSearch =
        !query ||
        resource.title?.toLowerCase().includes(query) ||
        resource.description?.toLowerCase().includes(query) ||
        resource.category?.toLowerCase().includes(query) ||
        resource.resource_type?.toLowerCase().includes(query);
      const matchesType = typeFilter === "all" || resource.resource_type === typeFilter;
      const matchesCategory = categoryFilter === "all" || resource.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [categoryFilter, resources, search, typeFilter]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/resources`, { headers });
      const data = await response.json();
      setResources(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Resources load error:", error);
      toast.error("Failed to load resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setResourceType("article");
    setResourceUrl("");
    setImageUrl("");
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
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.warning("Resource title is required.");
      return;
    }

    const url = editingId ? `${API_BASE_URL}/resources/${editingId}` : `${API_BASE_URL}/resources`;
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          resource_type: resourceType,
          resource_url: resourceUrl,
          image_url: imageUrl,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Resource save failed.");
        return;
      }

      toast.success(editingId ? "Resource updated successfully." : "Resource added successfully.");
      closeDrawer();
      loadResources();
    } catch (error) {
      console.error("Resource save error:", error);
      toast.error("Could not save resource.");
    }
  };

  const handleDelete = async (resource: Resource) => {
    if (!confirm(`Delete resource: ${resource.title}?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/resources/${resource.id}`, { method: "DELETE", headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Delete failed.");
        return;
      }

      toast.success("Resource deleted.");
      loadResources();
    } catch (error) {
      console.error("Resource delete error:", error);
      toast.error("Could not delete resource.");
    }
  };

  return (
    <AdminLayout title="Manage Resources">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Resource library</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Employee education content manager</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Add articles, PDFs, videos, webinars, and external links for employees. Keep content categorized and easy to discover.
          </p>
          <button type="button" onClick={openCreateDrawer} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">
            Add Resource
          </button>
        </div>

        <div className="premium-card">
          <p className="eyebrow">Library stats</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3">
              <p className="text-2xl font-black text-violet-700">{resources.length}</p>
              <p className="text-[11px] font-bold text-slate-500">Total</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3">
              <p className="text-2xl font-black text-blue-700">{categories.length}</p>
              <p className="text-[11px] font-bold text-slate-500">Categories</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-2xl font-black text-emerald-700">{resources.filter((item) => item.resource_type === "video").length}</p>
              <p className="text-[11px] font-bold text-slate-500">Videos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card overflow-hidden p-0">
        <div className="border-b border-slate-100 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-center">
            <input className="form-field" placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="article">Article</option>
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
              <option value="link">Link</option>
              <option value="webinar">Webinar</option>
            </select>
            <select className="form-field" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Resource</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Link</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map((resource) => (
                <tr key={resource.id} className="border-b last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {resource.image_url ? <img src={resource.image_url} alt={resource.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-lg font-black text-violet-500">▤</div>}
                      </div>
                      <div>
                        <p className="font-black text-slate-950">{resource.title}</p>
                        <p className="line-clamp-1 max-w-lg text-xs text-slate-500">{resource.description || "No description"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">{resource.category || "General"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase text-violet-700">{resource.resource_type || "article"}</span>
                  </td>
                  <td className="px-4 py-3">
                    {resource.resource_url ? <a href={resource.resource_url} target="_blank" rel="noreferrer" className="font-black text-blue-600 hover:text-violet-700">Open</a> : <span className="text-slate-400">No link</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <details className="relative inline-block text-left">
                      <summary className="list-none rounded-full bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">⋯</summary>
                      <div className="absolute right-0 z-20 mt-2 w-36 rounded-2xl border border-slate-100 bg-white p-2 text-left shadow-xl">
                        <button type="button" onClick={() => startEdit(resource)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700">Edit</button>
                        <button type="button" onClick={() => handleDelete(resource)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredResources.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-lg font-black text-slate-700">No resources found</p>
            <p className="mt-1 text-sm text-slate-500">Try clearing filters or add a new resource.</p>
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[82vw] xl:w-[900px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Resource drawer editor</p>
                <h2 className="text-2xl font-black">{editingId ? "Edit Resource" : "Create Resource"}</h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.82fr]">
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Title</span>
                  <input className="form-field" placeholder="Resource title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Description</span>
                  <textarea className="form-field min-h-28" placeholder="Short resource summary" value={description} onChange={(e) => setDescription(e.target.value)} />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Category</span>
                    <input className="form-field" placeholder="Mortgage / Credit / Planning" value={category} onChange={(e) => setCategory(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Type</span>
                    <select className="form-field" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
                      <option value="article">Article</option>
                      <option value="pdf">PDF</option>
                      <option value="video">Video</option>
                      <option value="link">Link</option>
                      <option value="webinar">Webinar</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Resource URL</span>
                  <input className="form-field" placeholder="https://..." value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Image URL</span>
                  <input className="form-field" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                </label>

                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <button className="btn-primary">{editingId ? "Update Resource" : "Create Resource"}</button>
                  <button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button>
                </div>
              </form>

              <section className="border-l border-slate-200 bg-white p-5">
                <p className="eyebrow">Live preview</p>
                <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
                  <div className="h-56 bg-slate-100">
                    {imageUrl ? <img src={imageUrl} alt="Resource preview" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-5xl font-black text-violet-200">▤</div>}
                  </div>
                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase text-violet-700">{resourceType}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{category || "Category"}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-950">{title || "Resource title preview"}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{description || "Resource description preview will appear here."}</p>
                    {resourceUrl && <p className="mt-4 font-black text-violet-700">Open resource →</p>}
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageResources;
