import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type Quiz = {
  id: number;
  title: string;
  description: string;
  is_active: number;
  access_type: string;
  created_at: string;
};

function ManageQuizzes() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(1);
  const [accessType, setAccessType] = useState("private");

  const filteredQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const matchesSearch =
        !query ||
        quiz.title?.toLowerCase().includes(query) ||
        quiz.description?.toLowerCase().includes(query) ||
        quiz.access_type?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || String(Number(quiz.is_active)) === statusFilter;
      const matchesAccess = accessFilter === "all" || quiz.access_type === accessFilter;
      return matchesSearch && matchesStatus && matchesAccess;
    });
  }, [accessFilter, quizzes, search, statusFilter]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/quizzes`);
      const data = await response.json();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Quiz load error:", error);
      toast.error("Failed to load quizzes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setIsActive(1);
    setAccessType("private");
  };

  const openCreateDrawer = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    resetForm();
  };

  const startEdit = (quiz: Quiz) => {
    setEditingId(quiz.id);
    setTitle(quiz.title || "");
    setDescription(quiz.description || "");
    setIsActive(quiz.is_active ? 1 : 0);
    setAccessType(quiz.access_type || "private");
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.warning("Quiz title is required.");
      return;
    }

    const url = editingId ? `${API_BASE_URL}/quizzes/${editingId}` : `${API_BASE_URL}/quizzes`;
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, is_active: isActive, access_type: accessType }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Quiz save failed.");
        return;
      }

      toast.success(editingId ? "Quiz updated." : "Quiz created.");
      closeDrawer();
      loadQuizzes();
    } catch (error) {
      console.error("Quiz save error:", error);
      toast.error("Could not save quiz.");
    }
  };

  const handleDelete = async (quiz: Quiz) => {
    const confirmDelete = confirm(`Delete quiz: ${quiz.title}?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/${quiz.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Delete failed.");
        return;
      }

      toast.success("Quiz deleted.");
      loadQuizzes();
    } catch (error) {
      console.error("Quiz delete error:", error);
      toast.error("Could not delete quiz.");
    }
  };

  return (
    <AdminLayout title="Manage Quizzes">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Quiz builder</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Employee readiness assessments</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Create readiness quizzes, control public/private access, and open each quiz to manage questions.
          </p>
          <button type="button" onClick={openCreateDrawer} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">
            Add Quiz
          </button>
        </div>

        <div className="premium-card">
          <p className="eyebrow">Quiz stats</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3">
              <p className="text-2xl font-black text-violet-700">{quizzes.length}</p>
              <p className="text-[11px] font-bold text-slate-500">Quizzes</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-2xl font-black text-emerald-700">{quizzes.filter((quiz) => Number(quiz.is_active) === 1).length}</p>
              <p className="text-[11px] font-bold text-slate-500">Active</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3">
              <p className="text-2xl font-black text-blue-700">{quizzes.filter((quiz) => quiz.access_type === "public").length}</p>
              <p className="text-[11px] font-bold text-slate-500">Public</p>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card overflow-hidden p-0">
        <div className="border-b border-slate-100 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-center">
            <input className="form-field" placeholder="Search quizzes..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All status</option>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </select>
            <select className="form-field" value={accessFilter} onChange={(e) => setAccessFilter(e.target.value)}>
              <option value="all">All access</option>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
            <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Quiz</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Quiz</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map((quiz) => (
                <tr key={quiz.id} className="border-b last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">{quiz.title}</p>
                    <p className="line-clamp-1 max-w-2xl text-xs text-slate-500">{quiz.description || "No description"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${quiz.access_type === "public" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>
                      {quiz.access_type === "public" ? "Public" : "Private"}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${quiz.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{quiz.is_active ? "Active" : "Disabled"}</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-500">{quiz.created_at ? new Date(quiz.created_at).toLocaleDateString() : "N/A"}</td>
                  <td className="px-4 py-3 text-right">
                    <details className="relative inline-block text-left">
                      <summary className="list-none rounded-full bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">⋯</summary>
                      <div className="absolute right-0 z-20 mt-2 w-40 rounded-2xl border border-slate-100 bg-white p-2 text-left shadow-xl">
                        <Link to={`/admin/quizzes/${quiz.id}/questions`} className="block rounded-xl px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50">Questions</Link>
                        <button type="button" onClick={() => startEdit(quiz)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700">Edit</button>
                        <button type="button" onClick={() => handleDelete(quiz)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredQuizzes.length === 0 && <div className="p-8 text-center text-slate-500">No quizzes found.</div>}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[82vw] xl:w-[900px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Quiz drawer editor</p>
                <h2 className="text-2xl font-black">{editingId ? "Edit Quiz" : "Create Quiz"}</h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.82fr]">
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Quiz Title</span><input className="form-field" placeholder="Readiness Quiz" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Description</span><textarea className="form-field min-h-40" placeholder="Quiz description" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}><option value={1}>Active</option><option value={0}>Disabled</option></select></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Access</span><select className="form-field" value={accessType} onChange={(e) => setAccessType(e.target.value)}><option value="private">Private - Employees only</option><option value="public">Public - Visible on quiz page</option></select></label>
                </div>
                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <button className="btn-primary">{editingId ? "Update Quiz" : "Create Quiz"}</button>
                  <button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button>
                </div>
              </form>

              <section className="border-l border-slate-200 bg-white p-5">
                <p className="eyebrow">Live preview</p>
                <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-xl">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${accessType === "public" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>{accessType === "public" ? "Public" : "Private"}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{isActive ? "Active" : "Disabled"}</span>
                  </div>
                  <h3 className="text-3xl font-black text-slate-950">{title || "Quiz title preview"}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{description || "Quiz description preview will appear here."}</p>
                  <p className="mt-6 font-black text-violet-700">Start quiz →</p>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageQuizzes;
