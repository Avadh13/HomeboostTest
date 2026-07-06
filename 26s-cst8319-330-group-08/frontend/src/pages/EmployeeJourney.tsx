import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type Journey = { id: number; title: string; description?: string | null };
type Step = { id: number; title: string; description?: string | null; progress_status?: string | null };
type JourneyPayload = { journey: Journey | null; steps: Step[]; progress: { percent: number; completed_steps: number; total_steps: number } };

function EmployeeJourney() {
  const [payload, setPayload] = useState<JourneyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const loadJourney = () => {
    fetch(`${API_BASE_URL}/journeys/me`, { headers })
      .then((res) => res.json())
      .then((data) => setPayload(data.status === "success" ? data : null))
      .catch(() => setPayload(null))
      .finally(() => setLoading(false));
  };

  const completeStep = async (stepId: number) => {
    await fetch(`${API_BASE_URL}/journeys/progress/${stepId}`, { method: "PUT", headers });
    loadJourney();
  };

  useEffect(() => { loadJourney(); }, []);

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container">
          <div className="mb-6 rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">My Journey</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Your home-buying path.</h1>
            <p className="mt-4 max-w-3xl text-slate-300">Complete each step and use your Home Buying Team when you need help.</p>
          </div>

          {loading ? <div className="loading-state">Loading journey...</div> : !payload?.journey ? <div className="empty-state">No journey assigned yet.</div> : (
            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
              <aside className="premium-card h-fit">
                <p className="eyebrow text-emerald-600">Assigned journey</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{payload.journey.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{payload.journey.description}</p>
                <div className="mt-6 h-3 rounded-full bg-slate-200"><div className="h-3 rounded-full bg-emerald-600" style={{ width: `${payload.progress.percent || 0}%` }} /></div>
                <p className="mt-3 text-sm font-black text-emerald-700">{payload.progress.completed_steps}/{payload.progress.total_steps} steps complete</p>
              </aside>

              <section className="space-y-4">
                {payload.steps.map((step, index) => (
                  <div key={step.id} className="premium-card flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <p className="text-sm font-black text-emerald-700">Step {index + 1}</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-950">{step.title}</h3>
                      <p className="mt-2 leading-relaxed text-slate-600">{step.description}</p>
                    </div>
                    <button onClick={() => completeStep(step.id)} className={`rounded-full px-5 py-2.5 text-sm font-black ${step.progress_status ? "bg-emerald-100 text-emerald-700" : "bg-slate-950 text-white hover:bg-emerald-700"}`}>
                      {step.progress_status ? "Completed" : "Mark Complete"}
                    </button>
                  </div>
                ))}
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default EmployeeJourney;
