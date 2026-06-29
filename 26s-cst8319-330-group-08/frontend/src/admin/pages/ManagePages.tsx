import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type Page = {
  id: number;
  slug: string;
  title: string;
  description: string;
  is_active: number;
};

function ManagePages() {
  const toast = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(1);
  const [slugPreview, setSlugPreview] = useState("");

  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();

    return pages.filter((page) => {
      const matchesSearch = !query || page.title?.toLowerCase().includes(query) || page.slug?.toLowerCase().includes(query) || page.description?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || String(Number(page.is_active)) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pages, search, statusFilter]);

  const loadPages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/pages`);
      const data = await response.json();
      setPages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Pages load error:", error);
      toast.error("Failed to load pages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const startEdit = (page: Page) => {
    setEditingId(page.id);
    setSlugPreview(page.slug || "");
    setTitle(page.title || "");
    setDescription(page.description || "");
    setIsActive(page.is_active ? 1 : 0);
    setDrawerOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setSlugPreview("");
    setTitle("");
    setDescription("");
    setIsActive(1);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    resetForm();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) return;

    if (!title.trim()) {
      toast.warning("Page title is required.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/pages/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, is_active: isActive }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Page update failed.");
        return;
      }

      toast.success("Page updated.");
      closeDrawer();
      loadPages();
    } catch (error) {
      console.error("Page update error:", error);
      toast.error("Could not update page.");
    }
  };

  return (
    <AdminLayout title="Manage Pages">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Page CMS</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Website page control</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Manage page names, descriptions, and active status. Page sections and cards are handled in the CMS builder modules.
          </p>
        </div>

        <div className="premium-card">
          <p className="eyebrow">Page stats</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3">
              <p className="text-2xl font-black text-violet-700">{pages.length}</p>
              <p className="text-[11px] font-bold text-slate-500">Pages</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-2xl font-black text-emerald-700">{pages.filter((page) => Number(page.is_active) === 1).length}</p>
              <p className="text-[11px] font-bold text-slate-500">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card overflow-hidden p-0">
        <div className="border-b border-slate-100 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-center">
            <input className="form-field" placeholder="Search pages..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All status</option>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => (
                <tr key={page.id} className="border-b last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">{page.title}</p>
                    <p className="line-clamp-1 max-w-2xl text-xs text-slate-500">{page.description || "No description"}</p>
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">/{page.slug}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${page.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{page.is_active ? "Active" : "Disabled"}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(page)} className="rounded-full bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredPages.length === 0 && <div className="p-8 text-center text-slate-500">No pages found.</div>}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[82vw] xl:w-[900px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Page drawer editor</p>
                <h2 className="text-2xl font-black">Edit Page</h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.82fr]">
              <form onSubmit={handleUpdate} className="space-y-4 p-5">
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Page Title</span><input className="form-field" placeholder="Page Title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Description</span><textarea className="form-field min-h-40" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}><option value={1}>Active</option><option value={0}>Disabled</option></select></label>
                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <button className="btn-primary">Update Page</button>
                  <button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button>
                </div>
              </form>

              <section className="border-l border-slate-200 bg-white p-5">
                <p className="eyebrow">Live preview</p>
                <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-xl">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">/{slugPreview || "page"}</span>
                  <h3 className="mt-4 text-3xl font-black text-slate-950">{title || "Page title"}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{description || "Page description preview will appear here."}</p>
                  <p className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-black ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{isActive ? "Active" : "Disabled"}</p>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManagePages;
