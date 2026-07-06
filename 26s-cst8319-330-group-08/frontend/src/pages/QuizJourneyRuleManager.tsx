import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type Rule = { id: number; rule_name: string; quiz_title?: string | null; journey_title?: string | null; readiness_level?: string | null; readiness_priority?: string | null; answer_keyword?: string | null; min_score?: number | null; max_score?: number | null; priority?: number; is_active?: number };
type Journey = { id: number; title: string };
type Quiz = { id: number; title: string };
type SubmitEventLike = { preventDefault: () => void };

const emptyForm = {
  rule_name: "",
  quiz_id: "",
  journey_id: "",
  readiness_level: "",
  readiness_priority: "",
  answer_keyword: "",
  min_score: "",
  max_score: "",
  priority: "100",
};

function QuizJourneyRuleManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesResponse, journeysResponse, quizzesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/quiz-journey-rules/rules`, { headers }),
        fetch(`${API_BASE_URL}/journeys`, { headers }),
        fetch(`${API_BASE_URL}/quizzes`, { headers }),
      ]);
      const [rulesData, journeysData, quizzesData] = await Promise.all([rulesResponse.json(), journeysResponse.json(), quizzesResponse.json()]);
      setRules(Array.isArray(rulesData.rules) ? rulesData.rules : []);
      setJourneys(Array.isArray(journeysData.journeys) ? journeysData.journeys : []);
      setQuizzes(Array.isArray(quizzesData) ? quizzesData : Array.isArray(quizzesData.quizzes) ? quizzesData.quizzes : []);
    } catch {
      setRules([]);
      setJourneys([]);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const createRule = async (event: SubmitEventLike) => {
    event.preventDefault();
    setNotice("");
    const response = await fetch(`${API_BASE_URL}/quiz-journey-rules/rules`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        rule_name: form.rule_name,
        quiz_id: form.quiz_id || null,
        journey_id: Number(form.journey_id),
        readiness_level: form.readiness_level || null,
        readiness_priority: form.readiness_priority || null,
        answer_keyword: form.answer_keyword || null,
        min_score: form.min_score ? Number(form.min_score) : null,
        max_score: form.max_score ? Number(form.max_score) : null,
        priority: Number(form.priority || 100),
        is_active: 1,
      }),
    });
    const data = await response.json();
    if (!response.ok || data.status !== "success") return setNotice(data.message || "Could not create rule");
    setNotice("Quiz journey rule created.");
    setForm(emptyForm);
    loadData();
  };

  const disableRule = async (id: number) => {
    await fetch(`${API_BASE_URL}/quiz-journey-rules/rules/${id}`, { method: "DELETE", headers });
    setNotice("Rule disabled.");
    loadData();
  };

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container space-y-6">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Quiz Journey Mapping</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Map quiz outcomes to journeys.</h1>
            <p className="mt-4 max-w-3xl text-slate-300">Create rules that automatically assign employees to the right journey after they submit an onboarding/readiness quiz.</p>
          </div>

          {notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700 ring-1 ring-blue-100">{notice}</div>}

          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <form onSubmit={createRule} className="premium-card h-fit space-y-4">
              <p className="eyebrow text-violet-600">New mapping rule</p>
              <h2 className="text-2xl font-black">Rule conditions</h2>
              <input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} required placeholder="Rule name" className="form-field" />
              <select value={form.quiz_id} onChange={(e) => setForm({ ...form, quiz_id: e.target.value })} className="form-field"><option value="">Any quiz</option>{quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}</select>
              <select value={form.journey_id} onChange={(e) => setForm({ ...form, journey_id: e.target.value })} required className="form-field"><option value="">Assign journey</option>{journeys.map((journey) => <option key={journey.id} value={journey.id}>{journey.title}</option>)}</select>
              <div className="grid gap-3 md:grid-cols-2"><input value={form.readiness_level} onChange={(e) => setForm({ ...form, readiness_level: e.target.value })} placeholder="Readiness level" className="form-field" /><input value={form.readiness_priority} onChange={(e) => setForm({ ...form, readiness_priority: e.target.value })} placeholder="Priority e.g. high" className="form-field" /></div>
              <input value={form.answer_keyword} onChange={(e) => setForm({ ...form, answer_keyword: e.target.value })} placeholder="Answer keyword e.g. first home" className="form-field" />
              <div className="grid gap-3 md:grid-cols-3"><input value={form.min_score} onChange={(e) => setForm({ ...form, min_score: e.target.value })} placeholder="Min score" className="form-field" /><input value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} placeholder="Max score" className="form-field" /><input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} placeholder="Priority" className="form-field" /></div>
              <button className="btn-primary w-full justify-center">Create Mapping Rule</button>
            </form>

            <section className="premium-card">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow text-blue-600">Active rules</p><h2 className="text-2xl font-black">Rule list</h2></div><button onClick={loadData} className="btn-secondary">Refresh</button></div>
              {loading ? <div className="loading-state">Loading rules...</div> : rules.length === 0 ? <div className="empty-state">No mapping rules yet.</div> : <div className="space-y-3">{rules.map((rule) => (
                <article key={rule.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">{rule.rule_name}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{rule.quiz_title || "Any quiz"} → {rule.journey_title || "Journey"}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                        {rule.readiness_level && <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Level: {rule.readiness_level}</span>}
                        {rule.readiness_priority && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Priority: {rule.readiness_priority}</span>}
                        {rule.answer_keyword && <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">Keyword: {rule.answer_keyword}</span>}
                        {(rule.min_score || rule.max_score) && <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Score: {rule.min_score || 0}-{rule.max_score || "max"}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-100">Priority {rule.priority || 100}</span><button onClick={() => disableRule(rule.id)} className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">Disable</button></div>
                  </div>
                </article>
              ))}</div>}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

export default QuizJourneyRuleManager;
