import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type FAQ = {
  id: number;
  question: string;
  answer: string;
  page_slug: string;
  display_order: number;
  is_active: number;
};

const PAGE_OPTIONS = ["home", "resources", "pricing", "employee-portal"];

function ManageFAQs() {
  const toast = useToast();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageFilter, setPageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pageSlug, setPageSlug] = useState("home");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(1);

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesSearch = !query || faq.question?.toLowerCase().includes(query) || faq.answer?.toLowerCase().includes(query) || faq.page_slug?.toLowerCase().includes(query);
      const matchesPage = pageFilter === "all" || faq.page_slug === pageFilter;
      const matchesStatus = statusFilter === "all" || String(Number(faq.is_active)) === statusFilter;
      return matchesSearch && matchesPage && matchesStatus;
    });
  }, [faqs, pageFilter, search, statusFilter]);

  const loadFaqs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/faqs`);
      const data = await response.json();
      setFaqs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("FAQ load error:", error);
      toast.error("Failed to load FAQs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setPageSlug("home");
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

  const startEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setQuestion(faq.question || "");
    setAnswer(faq.answer || "");
    setPageSlug(faq.page_slug || "home");
    setDisplayOrder(faq.display_order || 0);
    setIsActive(faq.is_active ? 1 : 0);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast.warning("Question is required.");
      return;
    }

    const url = editingId ? `${API_BASE_URL}/faqs/${editingId}` : `${API_BASE_URL}/faqs`;
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer,
          page_slug: pageSlug,
          display_order: displayOrder,
          is_active: isActive,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "FAQ save failed.");
        return;
      }

      toast.success(editingId ? "FAQ updated." : "FAQ created.");
      closeDrawer();
      loadFaqs();
    } catch (error) {
      console.error("FAQ save error:", error);
      toast.error("Could not save FAQ.");
    }
  };

  const handleDelete = async (faq: FAQ) => {
    const confirmDelete = confirm(`Delete FAQ: ${faq.question}?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/faqs/${faq.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Delete failed.");
        return;
      }

      toast.success("FAQ deleted.");
      loadFaqs();
    } catch (error) {
      console.error("FAQ delete error:", error);
      toast.error("Could not delete FAQ.");
    }
  };

  return (
    <AdminLayout title="Manage FAQs">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">FAQ CMS</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Question and answer editor</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Manage FAQ blocks for home, resources, pricing, and employee portal pages with page filters and live preview.
          </p>
          <button type="button" onClick={openCreateDrawer} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">
            Add FAQ
          </button>
        </div>

        <div className="premium-card">
          <p className="eyebrow">FAQ stats</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3">
              <p className="text-2xl font-black text-violet-700">{faqs.length}</p>
              <p className="text-[11px] font-bold text-slate-500">FAQs</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-2xl font-black text-emerald-700">{faqs.filter((faq) => Number(faq.is_active) === 1).length}</p>
              <p className="text-[11px] font-bold text-slate-500">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card overflow-hidden p-0">
        <div className="border-b border-slate-100 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-center">
            <input className="form-field" placeholder="Search FAQs..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={pageFilter} onChange={(e) => setPageFilter(e.target.value)}>
              <option value="all">All pages</option>
              {PAGE_OPTIONS.map((page) => <option key={page} value={page}>{page}</option>)}
            </select>
            <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All status</option>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </select>
            <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add FAQ</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaqs.map((faq) => (
                <tr key={faq.id} className="border-b last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">{faq.question}</p>
                    <p className="line-clamp-1 max-w-lg text-xs text-slate-500">{faq.answer || "No answer"}</p>
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{faq.page_slug}</span></td>
                  <td className="px-4 py-3 font-bold text-slate-600">{faq.display_order}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${faq.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{faq.is_active ? "Active" : "Disabled"}</span></td>
                  <td className="px-4 py-3 text-right">
                    <details className="relative inline-block text-left">
                      <summary className="list-none rounded-full bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">⋯</summary>
                      <div className="absolute right-0 z-20 mt-2 w-36 rounded-2xl border border-slate-100 bg-white p-2 text-left shadow-xl">
                        <button type="button" onClick={() => startEdit(faq)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700">Edit</button>
                        <button type="button" onClick={() => handleDelete(faq)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredFaqs.length === 0 && <div className="p-8 text-center text-slate-500">No FAQs found.</div>}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[82vw] xl:w-[900px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">FAQ drawer editor</p>
                <h2 className="text-2xl font-black">{editingId ? "Edit FAQ" : "Create FAQ"}</h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.82fr]">
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Question</span><input className="form-field" placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Answer</span><textarea className="form-field min-h-40" placeholder="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} /></label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Page</span><select className="form-field" value={pageSlug} onChange={(e) => setPageSlug(e.target.value)}>{PAGE_OPTIONS.map((page) => <option key={page} value={page}>{page}</option>)}</select></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Display Order</span><input className="form-field" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></label>
                </div>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}><option value={1}>Active</option><option value={0}>Disabled</option></select></label>
                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <button className="btn-primary">{editingId ? "Update FAQ" : "Create FAQ"}</button>
                  <button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button>
                </div>
              </form>

              <section className="border-l border-slate-200 bg-white p-5">
                <p className="eyebrow">Live preview</p>
                <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-xl">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{pageSlug}</span>
                  <h3 className="mt-4 text-xl font-black text-slate-950">{question || "FAQ question preview"}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{answer || "FAQ answer preview will appear here as you type."}</p>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageFAQs;
