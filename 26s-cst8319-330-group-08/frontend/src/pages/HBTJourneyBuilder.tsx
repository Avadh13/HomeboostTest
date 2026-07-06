import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type Resource = { id: number; title: string; category?: string | null };
type Journey = { id: number; title: string; description?: string | null; journey_type?: string | null; is_default?: number; sort_order?: number; step_count?: number };
type StepResource = { id: number; title: string; category?: string | null; journey_step_id?: number };
type ChecklistItem = { id: number; title: string; description?: string | null; is_required?: number };
type Step = { id: number; title: string; description?: string | null; step_type?: string | null; sort_order?: number; resources?: StepResource[]; checklist_items?: ChecklistItem[] };
type JourneyDetail = { journey: Journey; steps: Step[] };
type SubmitEventLike = { preventDefault: () => void };

const emptyJourney = { title: "", description: "", journey_type: "home_buying", sort_order: "0", is_default: false };
const emptyStep = { title: "", description: "", step_type: "task", sort_order: "0" };

function HBTJourneyBuilder() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState("");
  const [detail, setDetail] = useState<JourneyDetail | null>(null);
  const [journeyForm, setJourneyForm] = useState(emptyJourney);
  const [stepForm, setStepForm] = useState({ journey_id: "", ...emptyStep });
  const [resourceSelections, setResourceSelections] = useState<Record<number, string>>({});
  const [checklistInputs, setChecklistInputs] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const selectedJourney = useMemo(() => journeys.find((journey) => String(journey.id) === selectedJourneyId) || null, [journeys, selectedJourneyId]);

  const loadJourneys = async () => {
    const response = await fetch(`${API_BASE_URL}/journeys`, { headers });
    const data = await response.json();
    const loaded = Array.isArray(data.journeys) ? data.journeys : [];
    setJourneys(loaded);
    if (!selectedJourneyId && loaded[0]) {
      setSelectedJourneyId(String(loaded[0].id));
      setStepForm((current) => ({ ...current, journey_id: String(loaded[0].id) }));
    }
  };

  const loadResources = async () => {
    const response = await fetch(`${API_BASE_URL}/resources`, { headers });
    const data = await response.json();
    setResources(Array.isArray(data) ? data : []);
  };

  const loadDetail = async (journeyId: string) => {
    if (!journeyId) return setDetail(null);
    const response = await fetch(`${API_BASE_URL}/journeys/${journeyId}`, { headers });
    const data = await response.json();
    setDetail(data.status === "success" ? { journey: data.journey, steps: data.steps || [] } : null);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await Promise.all([loadJourneys(), loadResources()]);
      if (selectedJourneyId) await loadDetail(selectedJourneyId);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (selectedJourneyId) { setStepForm((current) => ({ ...current, journey_id: selectedJourneyId })); loadDetail(selectedJourneyId); } }, [selectedJourneyId]);

  const createJourney = async (event: SubmitEventLike) => {
    event.preventDefault();
    setNotice("");
    const response = await fetch(`${API_BASE_URL}/journeys`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ ...journeyForm, is_default: journeyForm.is_default ? 1 : 0, sort_order: Number(journeyForm.sort_order || 0) }),
    });
    const data = await response.json();
    if (!response.ok || data.status !== "success") return setNotice(data.message || "Could not create journey");
    setNotice("Journey created.");
    setJourneyForm(emptyJourney);
    setSelectedJourneyId(String(data.journey_id));
    await loadJourneys();
  };

  const duplicateJourney = async (journeyId: number) => {
    const response = await fetch(`${API_BASE_URL}/journeys/${journeyId}/duplicate`, { method: "POST", headers });
    const data = await response.json();
    setNotice(data.status === "success" ? "Journey duplicated." : data.message || "Could not duplicate journey");
    if (data.journey_id) setSelectedJourneyId(String(data.journey_id));
    await loadJourneys();
  };

  const archiveJourney = async (journeyId: number) => {
    if (!window.confirm("Archive this journey?")) return;
    await fetch(`${API_BASE_URL}/journeys/${journeyId}`, { method: "DELETE", headers });
    setNotice("Journey archived.");
    setSelectedJourneyId("");
    setDetail(null);
    await loadJourneys();
  };

  const addStep = async (event: SubmitEventLike) => {
    event.preventDefault();
    if (!stepForm.journey_id) return setNotice("Select a journey first.");
    const response = await fetch(`${API_BASE_URL}/journeys/${stepForm.journey_id}/steps`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ title: stepForm.title, description: stepForm.description, step_type: stepForm.step_type, sort_order: Number(stepForm.sort_order || 0) }),
    });
    const data = await response.json();
    if (!response.ok || data.status !== "success") return setNotice(data.message || "Could not add step");
    setNotice("Step added.");
    setStepForm({ journey_id: stepForm.journey_id, ...emptyStep });
    await loadDetail(stepForm.journey_id);
    await loadJourneys();
  };

  const archiveStep = async (stepId: number) => {
    await fetch(`${API_BASE_URL}/journeys/steps/${stepId}`, { method: "DELETE", headers });
    if (selectedJourneyId) await loadDetail(selectedJourneyId);
  };

  const attachResource = async (stepId: number) => {
    const resourceId = Number(resourceSelections[stepId]);
    if (!resourceId) return setNotice("Choose a resource first.");
    const response = await fetch(`${API_BASE_URL}/journeys/steps/${stepId}/resources`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ resource_id: resourceId }),
    });
    const data = await response.json();
    setNotice(data.status === "success" ? "Resource attached." : data.message || "Could not attach resource");
    if (selectedJourneyId) await loadDetail(selectedJourneyId);
  };

  const detachResource = async (stepId: number, resourceId: number) => {
    await fetch(`${API_BASE_URL}/journeys/steps/${stepId}/resources/${resourceId}`, { method: "DELETE", headers });
    if (selectedJourneyId) await loadDetail(selectedJourneyId);
  };

  const addChecklistItem = async (stepId: number) => {
    const title = (checklistInputs[stepId] || "").trim();
    if (!title) return setNotice("Checklist title is required.");
    const response = await fetch(`${API_BASE_URL}/journeys/steps/${stepId}/checklist`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ title, is_required: 1 }),
    });
    const data = await response.json();
    setNotice(data.status === "success" ? "Checklist item added." : data.message || "Could not add checklist item");
    setChecklistInputs((current) => ({ ...current, [stepId]: "" }));
    if (selectedJourneyId) await loadDetail(selectedJourneyId);
  };

  const archiveChecklistItem = async (itemId: number) => {
    await fetch(`${API_BASE_URL}/journeys/checklist/${itemId}`, { method: "DELETE", headers });
    if (selectedJourneyId) await loadDetail(selectedJourneyId);
  };

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container space-y-6">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">HBT Journey Builder</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Build employee journeys.</h1>
            <p className="mt-4 max-w-3xl text-slate-300">Create journeys, add steps, attach resources, and add checklist actions that employees can follow inside their portal.</p>
          </div>
          {notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700 ring-1 ring-blue-100">{notice}</div>}

          <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
            <aside className="space-y-6">
              <form onSubmit={createJourney} className="premium-card space-y-4">
                <p className="eyebrow text-emerald-600">Create journey</p>
                <h2 className="text-2xl font-black">New journey</h2>
                <input value={journeyForm.title} onChange={(e) => setJourneyForm({ ...journeyForm, title: e.target.value })} required placeholder="Journey title" className="form-field" />
                <textarea value={journeyForm.description} onChange={(e) => setJourneyForm({ ...journeyForm, description: e.target.value })} rows={3} placeholder="Description" className="form-field" />
                <div className="grid gap-3 md:grid-cols-2"><input value={journeyForm.journey_type} onChange={(e) => setJourneyForm({ ...journeyForm, journey_type: e.target.value })} className="form-field" /><input value={journeyForm.sort_order} onChange={(e) => setJourneyForm({ ...journeyForm, sort_order: e.target.value })} className="form-field" /></div>
                <label className="flex items-center gap-2 text-sm font-black text-slate-700"><input type="checkbox" checked={journeyForm.is_default} onChange={(e) => setJourneyForm({ ...journeyForm, is_default: e.target.checked })} /> Default journey</label>
                <button className="btn-primary w-full justify-center">Create Journey</button>
              </form>

              <form onSubmit={addStep} className="premium-card space-y-4">
                <p className="eyebrow text-blue-600">Add step</p>
                <h2 className="text-2xl font-black">Journey step</h2>
                <select value={stepForm.journey_id} onChange={(e) => setStepForm({ ...stepForm, journey_id: e.target.value })} className="form-field"><option value="">Select journey</option>{journeys.map((journey) => <option key={journey.id} value={journey.id}>{journey.title}</option>)}</select>
                <input value={stepForm.title} onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })} required placeholder="Step title" className="form-field" />
                <textarea value={stepForm.description} onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })} rows={3} placeholder="Step description" className="form-field" />
                <div className="grid gap-3 md:grid-cols-2"><input value={stepForm.step_type} onChange={(e) => setStepForm({ ...stepForm, step_type: e.target.value })} className="form-field" /><input value={stepForm.sort_order} onChange={(e) => setStepForm({ ...stepForm, sort_order: e.target.value })} className="form-field" /></div>
                <button className="btn-secondary w-full justify-center">Add Step</button>
              </form>
            </aside>

            <section className="premium-card">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><p className="eyebrow text-violet-600">Journey library</p><h2 className="text-2xl font-black">Manage journeys</h2></div>
                <button onClick={refresh} className="btn-secondary">Refresh</button>
              </div>

              <div className="grid gap-3 md:grid-cols-[320px_1fr]">
                <div className="space-y-3">
                  {loading ? <div className="loading-state">Loading...</div> : journeys.map((journey) => (
                    <button key={journey.id} onClick={() => setSelectedJourneyId(String(journey.id))} className={`w-full rounded-3xl border p-4 text-left transition ${String(journey.id) === selectedJourneyId ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50 hover:bg-white"}`}>
                      <h3 className="font-black text-slate-950">{journey.title}</h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">{journey.step_count || 0} step(s) · {journey.journey_type || "home_buying"}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {!selectedJourney || !detail ? <div className="empty-state">Select a journey to edit.</div> : (
                    <>
                      <div className="rounded-3xl bg-slate-950 p-5 text-white">
                        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-emerald-200">Selected journey</p><h3 className="mt-1 text-2xl font-black">{detail.journey.title}</h3><p className="mt-2 text-sm text-slate-300">{detail.journey.description || "No description"}</p></div><div className="flex gap-2"><button onClick={() => duplicateJourney(detail.journey.id)} className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white">Duplicate</button><button onClick={() => archiveJourney(detail.journey.id)} className="rounded-full bg-red-500 px-3 py-2 text-xs font-black text-white">Archive</button></div></div>
                      </div>

                      {detail.steps.length === 0 ? <div className="empty-state">No steps yet. Add the first step.</div> : detail.steps.map((step, index) => (
                        <article key={step.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-emerald-700">Step {index + 1}</p><h4 className="mt-1 text-xl font-black text-slate-950">{step.title}</h4><p className="mt-1 text-sm text-slate-600">{step.description}</p></div><button onClick={() => archiveStep(step.id)} className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">Archive step</button></div>

                          <div className="mt-4 grid gap-3 xl:grid-cols-2">
                            <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100"><p className="mb-2 text-xs font-black uppercase text-slate-400">Resources</p><div className="flex gap-2"><select value={resourceSelections[step.id] || ""} onChange={(e) => setResourceSelections((current) => ({ ...current, [step.id]: e.target.value }))} className="form-field"><option value="">Choose resource</option>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select><button onClick={() => attachResource(step.id)} className="btn-secondary">Add</button></div><div className="mt-3 flex flex-wrap gap-2">{(step.resources || []).map((resource) => <span key={resource.id} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{resource.title} <button onClick={() => detachResource(step.id, resource.id)} className="ml-1 text-red-500">×</button></span>)}</div></div>
                            <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100"><p className="mb-2 text-xs font-black uppercase text-slate-400">Checklist</p><div className="flex gap-2"><input value={checklistInputs[step.id] || ""} onChange={(e) => setChecklistInputs((current) => ({ ...current, [step.id]: e.target.value }))} placeholder="Checklist item" className="form-field" /><button onClick={() => addChecklistItem(step.id)} className="btn-secondary">Add</button></div><div className="mt-3 space-y-2">{(step.checklist_items || []).map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"><span>{item.title}</span><button onClick={() => archiveChecklistItem(item.id)} className="text-red-600">Remove</button></div>)}</div></div>
                          </div>
                        </article>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HBTJourneyBuilder;
