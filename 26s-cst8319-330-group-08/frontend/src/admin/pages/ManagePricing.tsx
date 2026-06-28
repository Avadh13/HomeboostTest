import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type PricingPlan = {
  id: number;
  title: string;
  price: string;
  description: string;
  features: string;
  button_text: string;
  button_link: string;
  display_order: number;
  is_active: number;
};

function ManagePricing() {
  const toast = useToast();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(1);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return plans.filter((plan) => {
      const matchesSearch =
        !query ||
        plan.title?.toLowerCase().includes(query) ||
        plan.price?.toLowerCase().includes(query) ||
        plan.description?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || String(Number(plan.is_active)) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [plans, search, statusFilter]);

  const featureList = useMemo(() => features.split(",").map((item) => item.trim()).filter(Boolean), [features]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/pricing`);
      const data = await response.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Pricing load error:", error);
      toast.error("Failed to load pricing plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setPrice("");
    setDescription("");
    setFeatures("");
    setButtonText("");
    setButtonLink("");
    setDisplayOrder(0);
    setIsActive(1);
  };

  const openCreateDrawer = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    resetForm();
  };

  const startEdit = (plan: PricingPlan) => {
    setEditingId(plan.id);
    setTitle(plan.title || "");
    setPrice(plan.price || "");
    setDescription(plan.description || "");
    setFeatures(plan.features || "");
    setButtonText(plan.button_text || "");
    setButtonLink(plan.button_link || "");
    setDisplayOrder(plan.display_order || 0);
    setIsActive(plan.is_active ? 1 : 0);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.warning("Plan title is required.");
      return;
    }

    const url = editingId ? `${API_BASE_URL}/pricing/${editingId}` : `${API_BASE_URL}/pricing`;
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          price,
          description,
          features,
          button_text: buttonText,
          button_link: buttonLink,
          display_order: displayOrder,
          is_active: isActive,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Pricing plan save failed.");
        return;
      }

      toast.success(editingId ? "Pricing plan updated." : "Pricing plan created.");
      closeDrawer();
      loadPlans();
    } catch (error) {
      console.error("Pricing save error:", error);
      toast.error("Could not save pricing plan.");
    }
  };

  const handleDelete = async (plan: PricingPlan) => {
    const confirmDelete = confirm(`Delete pricing plan: ${plan.title}?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/pricing/${plan.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Delete failed.");
        return;
      }

      toast.success("Pricing plan deleted.");
      loadPlans();
    } catch (error) {
      console.error("Pricing delete error:", error);
      toast.error("Could not delete pricing plan.");
    }
  };

  return (
    <AdminLayout title="Manage Pricing">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Pricing CMS</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Plan editor with live preview</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Manage pricing cards, feature bullets, calls-to-action, and display order from a polished drawer editor.
          </p>
          <button type="button" onClick={openCreateDrawer} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">
            Add Plan
          </button>
        </div>

        <div className="premium-card">
          <p className="eyebrow">Pricing stats</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3">
              <p className="text-2xl font-black text-violet-700">{plans.length}</p>
              <p className="text-[11px] font-bold text-slate-500">Plans</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-2xl font-black text-emerald-700">{plans.filter((plan) => Number(plan.is_active) === 1).length}</p>
              <p className="text-[11px] font-bold text-slate-500">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card overflow-hidden p-0">
        <div className="border-b border-slate-100 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-center">
            <input className="form-field" placeholder="Search pricing plans..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All status</option>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </select>
            <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Plan</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => (
                <tr key={plan.id} className="border-b last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">{plan.title}</p>
                    <p className="line-clamp-1 max-w-lg text-xs text-slate-500">{plan.description || "No description"}</p>
                  </td>
                  <td className="px-4 py-3 text-lg font-black text-violet-700">{plan.price}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{plan.display_order}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{plan.is_active ? "Active" : "Disabled"}</span></td>
                  <td className="px-4 py-3 text-right">
                    <details className="relative inline-block text-left">
                      <summary className="list-none rounded-full bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">⋯</summary>
                      <div className="absolute right-0 z-20 mt-2 w-36 rounded-2xl border border-slate-100 bg-white p-2 text-left shadow-xl">
                        <button type="button" onClick={() => startEdit(plan)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700">Edit</button>
                        <button type="button" onClick={() => handleDelete(plan)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredPlans.length === 0 && <div className="p-8 text-center text-slate-500">No pricing plans found.</div>}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[82vw] xl:w-[900px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Pricing drawer editor</p>
                <h2 className="text-2xl font-black">{editingId ? "Edit Plan" : "Create Plan"}</h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.82fr]">
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Plan Title</span><input className="form-field" placeholder="Starter / Professional / Enterprise" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Price</span><input className="form-field" placeholder="$499/mo or Custom" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Description</span><textarea className="form-field min-h-28" placeholder="Short plan summary" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Features</span><textarea className="form-field min-h-28" placeholder="Comma separated features" value={features} onChange={(e) => setFeatures(e.target.value)} /></label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Button Text</span><input className="form-field" placeholder="Get Started" value={buttonText} onChange={(e) => setButtonText(e.target.value)} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Button Link</span><input className="form-field" placeholder="/contact" value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} /></label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Display Order</span><input className="form-field" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}><option value={1}>Active</option><option value={0}>Disabled</option></select></label>
                </div>
                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <button className="btn-primary">{editingId ? "Update Plan" : "Create Plan"}</button>
                  <button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button>
                </div>
              </form>

              <section className="border-l border-slate-200 bg-white p-5">
                <p className="eyebrow">Live preview</p>
                <div className="mt-4 rounded-[1.75rem] border border-violet-100 bg-white p-6 shadow-xl">
                  <h3 className="text-2xl font-black text-slate-950">{title || "Plan title"}</h3>
                  <p className="mt-3 text-4xl font-black gradient-text">{price || "$0/mo"}</p>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{description || "Plan description preview."}</p>
                  <ul className="my-6 space-y-2">
                    {(featureList.length ? featureList : ["Feature one", "Feature two", "Feature three"]).map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm font-bold text-slate-700"><span className="text-violet-600">✓</span>{feature}</li>
                    ))}
                  </ul>
                  {buttonText && <p className="btn-primary w-full">{buttonText}</p>}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManagePricing;
