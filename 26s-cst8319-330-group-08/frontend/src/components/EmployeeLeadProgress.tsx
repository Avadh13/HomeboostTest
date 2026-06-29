import { useEffect, useState } from "react";
import API_BASE_URL from "../api/api";

type LeadTodo = {
  id: number;
  label: string;
  is_completed: number;
};

type LeadProgress = {
  assignment: {
    id: number;
    member_name?: string | null;
    member_email?: string | null;
    progress_percent?: number;
  } | null;
  todos: LeadTodo[];
  progress_percent: number;
};

type EmployeeLeadProgressProps = {
  primary: string;
};

function EmployeeLeadProgress({ primary }: EmployeeLeadProgressProps) {
  const [progress, setProgress] = useState<LeadProgress | null>(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${API_BASE_URL}/lead-progress/employee`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((payload) => setProgress(payload))
      .catch(() => setProgress(null));
  }, [token]);

  if (!progress || !progress.assignment) {
    return (
      <section className="rounded-[2rem] bg-white p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Advisor progress</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Your advisor checklist will appear here soon.</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Once your Home Buying Team assigns an advisor, you will see your working progress and next steps here.</p>
      </section>
    );
  }

  const percent = Number(progress.progress_percent || 0);

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-xl">
      <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Advisor progress</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Your active support plan</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Assigned advisor: <strong>{progress.assignment.member_name || "HBT member"}</strong></p>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-black uppercase tracking-wide text-slate-500"><span>Progress</span><span>{percent}%</span></div>
            <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: primary }} /></div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {progress.todos.map((todo) => (
            <div key={todo.id} className={`rounded-2xl border p-4 text-sm font-bold ${Number(todo.is_completed) === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
              <span className="mr-2">{Number(todo.is_completed) === 1 ? "✅" : "⬜"}</span>{todo.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default EmployeeLeadProgress;
