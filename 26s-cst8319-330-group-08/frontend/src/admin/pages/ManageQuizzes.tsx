import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type Quiz = {
  id: number;
  team_id?: number | null;
  title: string;
  description?: string | null;
  is_global?: number;
  is_active: number;
  access_type: "public" | "private" | "employee";
  created_at?: string | null;
};

type QuizForm = {
  title: string;
  description: string;
  is_active: number;
  access_type: "public" | "private";
};

const emptyForm: QuizForm = {
  title: "",
  description: "",
  is_active: 1,
  access_type: "public",
};

function ManageQuizzes() {
  const toast = useToast();
  const token = localStorage.getItem("token") || "";
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [form, setForm] = useState<QuizForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");

  const requestHeaders = (withJson = false): HeadersInit => ({
    Authorization: `Bearer ${token}`,
    ...(withJson ? { "Content-Type": "application/json" } : {}),
  });

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/quizzes`, {
        headers: requestHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to load quizzes");
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (error) {
      setQuizzes([]);
      toast.error(error instanceof Error ? error.message : "Failed to load quizzes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuizzes();
  }, []);

  const filteredQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      const matchesSearch =
        !query ||
        quiz.title.toLowerCase().includes(query) ||
        String(quiz.description || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || String(Number(quiz.is_active)) === statusFilter;
      const normalizedAccess = quiz.access_type === "employee" ? "public" : quiz.access_type;
      const matchesAccess = accessFilter === "all" || normalizedAccess === accessFilter;
      return matchesSearch && matchesStatus && matchesAccess;
    });
  }, [accessFilter, quizzes, search, statusFilter]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreateDrawer = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };

  const startEdit = (quiz: Quiz) => {
    setEditingId(quiz.id);
    setForm({
      title: quiz.title || "",
      description: quiz.description || "",
      is_active: Number(quiz.is_active) === 1 ? 1 : 0,
      access_type: quiz.access_type === "private" ? "private" : "public",
    });
    setDrawerOpen(true);
  };

  const saveQuiz = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.warning("Quiz title is required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        editingId ? `${API_BASE_URL}/quizzes/${editingId}` : `${API_BASE_URL}/quizzes`,
        {
          method: editingId ? "PUT" : "POST",
          headers: requestHeaders(true),
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            is_active: form.is_active,
            access_type: form.access_type,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Quiz save failed");

      toast.success(editingId ? "Quiz updated." : "Quiz created.");
      closeDrawer();
      await loadQuizzes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save quiz.");
    } finally {
      setSaving(false);
    }
  };

  const disableQuiz = async (quiz: Quiz) => {
    if (!window.confirm(`Disable quiz: ${quiz.title}?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/${quiz.id}`, {
        method: "DELETE",
        headers: requestHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Quiz disable failed");
      toast.success("Quiz disabled.");
      await loadQuizzes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disable quiz.");
    }
  };

  const accessLabel = (quiz: Quiz) =>
    quiz.access_type === "private" ? "Assigned partnerships" : "Employee catalog";

  return (
    <AdminLayout title="Manage Quizzes">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Quiz builder</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Employee readiness assessments</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Employee-catalog quizzes are visible only to authenticated Employees in an eligible partnership. Assigned-partnership quizzes remain hidden until explicitly linked.
          </p>
          <button type="button" onClick={openCreateDrawer} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">
            Add Quiz
          </button>
        </div>

        <div className="premium-card">
          <p className="eyebrow">Quiz stats</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3"><p className="text-2xl font-black text-violet-700">{quizzes.length}</p><p className="text-[11px] font-bold text-slate-500">Quizzes</p></div>
            <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-2xl font-black text-emerald-700">{quizzes.filter((quiz) => Number(quiz.is_active) === 1).length}</p><p className="text-[11px] font-bold text-slate-500">Active</p></div>
            <div className="rounded-2xl bg-blue-50 p-3"><p className="text-2xl font-black text-blue-700">{quizzes.filter((quiz) => quiz.access_type !== "private").length}</p><p className="text-[11px] font-bold text-slate-500">Catalog</p></div>
          </div>
        </div>
      </div>

      <section className="premium-card overflow-hidden p-0">
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_190px_210px_auto] md:items-center">
          <input className="form-field" placeholder="Search quizzes..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="form-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All status</option><option value="1">Active</option><option value="0">Disabled</option>
          </select>
          <select className="form-field" value={accessFilter} onChange={(event) => setAccessFilter(event.target.value)}>
            <option value="all">All visibility</option><option value="public">Employee catalog</option><option value="private">Assigned partnerships</option>
          </select>
          <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Quiz</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Quiz</th><th className="px-4 py-3">Visibility</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {filteredQuizzes.map((quiz) => (
                <tr key={quiz.id} className="border-b last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-3"><p className="font-black text-slate-950">{quiz.title}</p><p className="line-clamp-1 max-w-2xl text-xs text-slate-500">{quiz.description || "No description"}</p></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${quiz.access_type === "private" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{accessLabel(quiz)}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${quiz.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{quiz.is_active ? "Active" : "Disabled"}</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-500">{quiz.created_at ? new Date(quiz.created_at).toLocaleDateString("en-CA") : "N/A"}</td>
                  <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Link to={`/admin/quizzes/${quiz.id}/questions`} className="rounded-full bg-violet-100 px-3 py-2 text-xs font-black text-violet-700">Questions</Link><button type="button" onClick={() => startEdit(quiz)} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Edit</button><button type="button" onClick={() => disableQuiz(quiz)} className="rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-600">Disable</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-8 text-center text-slate-500">Loading quizzes...</div>}
        {!loading && filteredQuizzes.length === 0 && <div className="p-8 text-center text-slate-500">No quizzes found.</div>}
      </section>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Quiz editor</p><h2 className="text-2xl font-black">{editingId ? "Edit Quiz" : "Create Quiz"}</h2></div><button type="button" onClick={closeDrawer} className="btn-secondary">Close</button></div>
            <form onSubmit={saveQuiz} className="flex-1 space-y-5 overflow-y-auto p-5">
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Quiz title</span><input className="form-field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={255} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Description</span><textarea className="form-field min-h-40" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={5000} /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={form.is_active} onChange={(event) => setForm({ ...form, is_active: Number(event.target.value) })}><option value={1}>Active</option><option value={0}>Disabled</option></select></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Visibility</span><select className="form-field" value={form.access_type} onChange={(event) => setForm({ ...form, access_type: event.target.value as QuizForm["access_type"] })}><option value="public">Employee catalog</option><option value="private">Assigned partnerships only</option></select></label>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">No quiz endpoint is anonymous. “Employee catalog” means visible to authenticated Employees whose partnership and team are eligible.</div>
              <div className="flex gap-3 border-t border-slate-200 pt-5"><button disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving..." : editingId ? "Update Quiz" : "Create Quiz"}</button><button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button></div>
            </form>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageQuizzes;
