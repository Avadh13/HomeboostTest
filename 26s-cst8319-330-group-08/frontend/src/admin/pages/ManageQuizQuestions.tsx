import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type QuizQuestion = {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: string;
  is_required: number;
  display_order: number;
  options?: QuizOption[];
};

type QuizOption = {
  id: number;
  question_id: number;
  option_text: string;
  display_order: number;
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

const optionTypes = ["multiple_choice", "checkbox", "dropdown", "true_false"];

function ManageQuizQuestions() {
  const { quizId } = useParams();
  const toast = useToast();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("short_text");
  const [isRequired, setIsRequired] = useState(1);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [options, setOptions] = useState<string[]>([""]);

  const needsOptions = optionTypes.includes(questionType);

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesSearch = !query || question.question_text?.toLowerCase().includes(query) || question.question_type?.toLowerCase().includes(query);
      const matchesType = typeFilter === "all" || question.question_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [questions, search, typeFilter]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setQuestions(data);
      } else {
        console.log("Questions API error:", data);
        setQuestions([]);
      }
    } catch (error) {
      console.log("Failed to load questions:", error);
      toast.error("Failed to load quiz questions.");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [quizId]);

  const resetForm = () => {
    setEditingId(null);
    setQuestionText("");
    setQuestionType("short_text");
    setIsRequired(1);
    setDisplayOrder(0);
    setOptions([""]);
  };

  const openCreateDrawer = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    resetForm();
  };

  const startEdit = (question: QuizQuestion) => {
    setEditingId(question.id);
    setQuestionText(question.question_text || "");
    setQuestionType(question.question_type || "short_text");
    setIsRequired(question.is_required ? 1 : 0);
    setDisplayOrder(question.display_order || 0);

    if (optionTypes.includes(question.question_type) && question.options && question.options.length > 0) {
      setOptions(question.options.map((option) => option.option_text));
    } else {
      setOptions([""]);
    }

    setDrawerOpen(true);
  };

  const addOptionField = () => {
    setOptions([...options, ""]);
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleQuestionTypeChange = (selectedType: string) => {
    setQuestionType(selectedType);

    if (selectedType === "true_false") {
      setOptions(["True", "False"]);
    } else if (["multiple_choice", "checkbox", "dropdown"].includes(selectedType)) {
      setOptions([""]);
    } else {
      setOptions([""]);
    }
  };

  const moveQuestionOrder = (question: QuizQuestion, direction: "up" | "down") => {
    startEdit(question);
    setDisplayOrder(Math.max(0, Number(question.display_order || 0) + (direction === "up" ? -1 : 1)));
    toast.info("Adjusted display order in editor. Click Update Question to save.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim()) {
      toast.warning("Question text is required.");
      return;
    }

    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);

    if (needsOptions && cleanOptions.length === 0) {
      toast.warning("Add at least one option for this question type.");
      return;
    }

    const url = editingId ? `${API_BASE_URL}/quizzes/questions/${editingId}` : `${API_BASE_URL}/quizzes/questions`;
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: Number(quizId),
          question_text: questionText,
          question_type: questionType,
          is_required: isRequired,
          display_order: displayOrder,
          options: needsOptions ? cleanOptions : [],
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Question save failed.");
        return;
      }

      toast.success(editingId ? "Question updated." : "Question created.");
      closeDrawer();
      loadQuestions();
    } catch (error) {
      console.error("Question save error:", error);
      toast.error("Could not save question.");
    }
  };

  const handleDelete = async (question: QuizQuestion) => {
    const confirmDelete = confirm(`Delete question: ${question.question_text}?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/questions/${question.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Delete failed.");
        return;
      }

      toast.success("Question deleted.");
      loadQuestions();
    } catch (error) {
      console.error("Question delete error:", error);
      toast.error("Could not delete question.");
    }
  };

  return (
    <AdminLayout title="Manage Quiz Questions">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Question builder</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Quiz #{quizId} question flow</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Build form-style quiz questions, add answer choices, and control display order using the existing display_order field.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={openCreateDrawer} className="rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">Add Question</button>
            <Link to="/admin/quizzes" className="rounded-full border border-white/30 px-4 py-2 text-xs font-black text-white hover:bg-white/10">Back to Quizzes</Link>
          </div>
        </div>

        <div className="premium-card">
          <p className="eyebrow">Question stats</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3"><p className="text-2xl font-black text-violet-700">{questions.length}</p><p className="text-[11px] font-bold text-slate-500">Total</p></div>
            <div className="rounded-2xl bg-blue-50 p-3"><p className="text-2xl font-black text-blue-700">{questions.filter((question) => optionTypes.includes(question.question_type)).length}</p><p className="text-[11px] font-bold text-slate-500">Choice</p></div>
            <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-2xl font-black text-emerald-700">{questions.filter((question) => Number(question.is_required) === 1).length}</p><p className="text-[11px] font-bold text-slate-500">Required</p></div>
          </div>
        </div>
      </div>

      <div className="premium-card overflow-hidden p-0">
        <div className="border-b border-slate-100 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-center">
            <input className="form-field" placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {questionTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}
            </select>
            <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Question</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Required</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((question) => (
                <tr key={question.id} className="border-b last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">{question.question_text}</p>
                    {question.options && question.options.length > 0 && <p className="line-clamp-1 text-xs text-slate-500">Options: {question.options.map((option) => option.option_text).join(", ")}</p>}
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{question.question_type.replace(/_/g, " ")}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-700">{question.display_order}</span>
                      <button type="button" onClick={() => moveQuestionOrder(question, "up")} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-200">↑</button>
                      <button type="button" onClick={() => moveQuestionOrder(question, "down")} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-200">↓</button>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${question.is_required ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{question.is_required ? "Required" : "Optional"}</span></td>
                  <td className="px-4 py-3 text-right">
                    <details className="relative inline-block text-left">
                      <summary className="list-none rounded-full bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">⋯</summary>
                      <div className="absolute right-0 z-20 mt-2 w-36 rounded-2xl border border-slate-100 bg-white p-2 text-left shadow-xl">
                        <button type="button" onClick={() => startEdit(question)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700">Edit</button>
                        <button type="button" onClick={() => handleDelete(question)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredQuestions.length === 0 && <div className="p-8 text-center text-slate-500">No questions found.</div>}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[86vw] xl:w-[980px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Question drawer editor</p>
                <h2 className="text-2xl font-black">{editingId ? "Edit Question" : "Create Question"}</h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.86fr]">
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Question text</span><textarea className="form-field min-h-36" placeholder="Question text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} /></label>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Type</span><select className="form-field" value={questionType} onChange={(e) => handleQuestionTypeChange(e.target.value)}>{questionTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}</select></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Required</span><select className="form-field" value={isRequired} onChange={(e) => setIsRequired(Number(e.target.value))}><option value={1}>Required</option><option value={0}>Optional</option></select></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Display Order</span><input className="form-field" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></label>
                </div>

                {needsOptions && (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-black text-violet-700">Answer options</p>
                      {questionType !== "true_false" && <button type="button" onClick={addOptionField} className="rounded-full bg-white px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-100">Add Option</button>}
                    </div>
                    <div className="space-y-3">
                      {options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input className="form-field" placeholder={`Option ${index + 1}`} value={option} onChange={(e) => updateOption(index, e.target.value)} disabled={questionType === "true_false"} />
                          {questionType !== "true_false" && options.length > 1 && <button type="button" onClick={() => removeOption(index)} className="rounded-xl bg-red-600 px-3 text-sm font-black text-white hover:bg-red-700">×</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <button className="btn-primary">{editingId ? "Update Question" : "Create Question"}</button>
                  <button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button>
                </div>
              </form>

              <section className="border-l border-slate-200 bg-white p-5">
                <p className="eyebrow">Live preview</p>
                <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-xl">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{questionType.replace(/_/g, " ")}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${isRequired ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{isRequired ? "Required" : "Optional"}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-950">{questionText || "Question preview will appear here."}</h3>
                  {needsOptions ? (
                    <div className="mt-5 space-y-2">
                      {(options.filter(Boolean).length ? options.filter(Boolean) : ["Option preview"]).map((option, index) => (
                        <div key={`${option}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">{option}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-400">Employee answer field preview</div>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageQuizQuestions;
