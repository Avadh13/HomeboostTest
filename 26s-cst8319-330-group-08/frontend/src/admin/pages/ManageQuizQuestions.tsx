import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type QuizOption = {
  id: number;
  question_id: number;
  option_text: string;
  display_order: number;
};

type QuizQuestion = {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: string;
  is_required: number;
  display_order: number;
  options?: QuizOption[];
};

type QuestionForm = {
  question_text: string;
  question_type: string;
  is_required: number;
  display_order: number;
  options: string[];
};

const questionTypes = [
  "short_text",
  "paragraph",
  "multiple_choice",
  "checkbox",
  "dropdown",
  "true_false",
  "number",
  "date",
  "email",
  "phone",
  "rating",
  "linear_scale",
];

const optionTypes = new Set(["multiple_choice", "checkbox", "dropdown", "true_false"]);

const emptyForm: QuestionForm = {
  question_text: "",
  question_type: "short_text",
  is_required: 1,
  display_order: 0,
  options: [""],
};

function ManageQuizQuestions() {
  const { quizId = "" } = useParams();
  const toast = useToast();
  const token = localStorage.getItem("token") || "";
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const headers = (json = false): HeadersInit => ({
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
        headers: headers(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to load quiz questions");
      setQuestions(Array.isArray(data) ? data : []);
    } catch (error) {
      setQuestions([]);
      toast.error(error instanceof Error ? error.message : "Failed to load quiz questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuestions();
  }, [quizId]);

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return questions.filter((question) => {
      const matchesSearch =
        !query ||
        question.question_text.toLowerCase().includes(query) ||
        question.question_type.toLowerCase().includes(query);
      const matchesType = typeFilter === "all" || question.question_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [questions, search, typeFilter]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreateDrawer = () => {
    setEditingId(null);
    setForm({ ...emptyForm, display_order: questions.length + 1 });
    setDrawerOpen(true);
  };

  const startEdit = (question: QuizQuestion) => {
    setEditingId(question.id);
    setForm({
      question_text: question.question_text || "",
      question_type: question.question_type || "short_text",
      is_required: Number(question.is_required) === 1 ? 1 : 0,
      display_order: Number(question.display_order || 0),
      options: question.options?.length ? question.options.map((option) => option.option_text) : [""],
    });
    setDrawerOpen(true);
  };

  const changeQuestionType = (questionType: string) => {
    setForm({
      ...form,
      question_type: questionType,
      options: questionType === "true_false" ? ["True", "False"] : optionTypes.has(questionType) ? [""] : [""],
    });
  };

  const updateOption = (index: number, value: string) => {
    const next = [...form.options];
    next[index] = value;
    setForm({ ...form, options: next });
  };

  const addOption = () => setForm({ ...form, options: [...form.options, ""] });
  const removeOption = (index: number) =>
    setForm({ ...form, options: form.options.filter((_, optionIndex) => optionIndex !== index) });

  const saveQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanQuestion = form.question_text.trim();
    const cleanOptions = form.options.map((option) => option.trim()).filter(Boolean);

    if (!cleanQuestion) {
      toast.warning("Question text is required.");
      return;
    }
    if (optionTypes.has(form.question_type) && cleanOptions.length < 1) {
      toast.warning("Add at least one answer option.");
      return;
    }
    if (new Set(cleanOptions.map((option) => option.toLowerCase())).size !== cleanOptions.length) {
      toast.warning("Answer options must be unique.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        editingId ? `${API_BASE_URL}/quizzes/questions/${editingId}` : `${API_BASE_URL}/quizzes/questions`,
        {
          method: editingId ? "PUT" : "POST",
          headers: headers(true),
          body: JSON.stringify({
            quiz_id: Number(quizId),
            question_text: cleanQuestion,
            question_type: form.question_type,
            is_required: form.is_required,
            display_order: form.display_order,
            options: optionTypes.has(form.question_type) ? cleanOptions : [],
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Question save failed");

      toast.success(editingId ? "Question updated." : "Question created.");
      closeDrawer();
      await loadQuestions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save question.");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (question: QuizQuestion) => {
    if (!window.confirm(`Delete question: ${question.question_text}?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/questions/${question.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Question delete failed");
      toast.success("Question deleted.");
      await loadQuestions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete question.");
    }
  };

  return (
    <AdminLayout title="Manage Quiz Questions">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Question builder</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Quiz #{quizId} question flow</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Required questions and option ownership are enforced by the server during submission.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={openCreateDrawer} className="rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800">Add Question</button>
            <Link to="/admin/quizzes" className="rounded-full border border-white/30 px-4 py-2 text-xs font-black text-white">Back to Quizzes</Link>
          </div>
        </div>

        <div className="premium-card">
          <p className="eyebrow">Question stats</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3"><p className="text-2xl font-black text-violet-700">{questions.length}</p><p className="text-[11px] font-bold text-slate-500">Total</p></div>
            <div className="rounded-2xl bg-blue-50 p-3"><p className="text-2xl font-black text-blue-700">{questions.filter((question) => optionTypes.has(question.question_type)).length}</p><p className="text-[11px] font-bold text-slate-500">Choice</p></div>
            <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-2xl font-black text-emerald-700">{questions.filter((question) => Number(question.is_required) === 1).length}</p><p className="text-[11px] font-bold text-slate-500">Required</p></div>
          </div>
        </div>
      </div>

      <section className="premium-card overflow-hidden p-0">
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_220px_auto] md:items-center">
          <input className="form-field" placeholder="Search questions..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="form-field" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option>{questionTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}</select>
          <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Question</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Question</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Required</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {filteredQuestions.map((question) => (
                <tr key={question.id} className="border-b last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-3"><p className="font-black text-slate-950">{question.question_text}</p>{question.options?.length ? <p className="line-clamp-1 text-xs text-slate-500">Options: {question.options.map((option) => option.option_text).join(", ")}</p> : null}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{question.question_type.replace(/_/g, " ")}</span></td>
                  <td className="px-4 py-3 font-black text-slate-700">{question.display_order}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${question.is_required ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{question.is_required ? "Required" : "Optional"}</span></td>
                  <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => startEdit(question)} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Edit</button><button type="button" onClick={() => deleteQuestion(question)} className="rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-600">Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-8 text-center text-slate-500">Loading questions...</div>}
        {!loading && filteredQuestions.length === 0 && <div className="p-8 text-center text-slate-500">No questions found.</div>}
      </section>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Question editor</p><h2 className="text-2xl font-black">{editingId ? "Edit Question" : "Create Question"}</h2></div><button type="button" onClick={closeDrawer} className="btn-secondary">Close</button></div>
            <form onSubmit={saveQuestion} className="flex-1 space-y-5 overflow-y-auto p-5">
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Question text</span><textarea className="form-field min-h-36" value={form.question_text} onChange={(event) => setForm({ ...form, question_text: event.target.value })} required maxLength={5000} /></label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Type</span><select className="form-field" value={form.question_type} onChange={(event) => changeQuestionType(event.target.value)}>{questionTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}</select></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Required</span><select className="form-field" value={form.is_required} onChange={(event) => setForm({ ...form, is_required: Number(event.target.value) })}><option value={1}>Required</option><option value={0}>Optional</option></select></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Display order</span><input className="form-field" type="number" min={0} value={form.display_order} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></label>
              </div>

              {optionTypes.has(form.question_type) && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                  <div className="mb-3 flex items-center justify-between"><p className="font-black text-violet-700">Answer options</p>{form.question_type !== "true_false" && <button type="button" onClick={addOption} className="rounded-full bg-white px-3 py-2 text-xs font-black text-violet-700">Add Option</button>}</div>
                  <div className="space-y-3">{form.options.map((option, index) => <div key={index} className="flex gap-2"><input className="form-field" value={option} onChange={(event) => updateOption(index, event.target.value)} disabled={form.question_type === "true_false"} maxLength={1000} />{form.question_type !== "true_false" && form.options.length > 1 && <button type="button" onClick={() => removeOption(index)} className="rounded-xl bg-red-600 px-3 font-black text-white">×</button>}</div>)}</div>
                </div>
              )}

              <div className="flex gap-3 border-t border-slate-200 pt-5"><button disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving..." : editingId ? "Update Question" : "Create Question"}</button><button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button></div>
            </form>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageQuizQuestions;
