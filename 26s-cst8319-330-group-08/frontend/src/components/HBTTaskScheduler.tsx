import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../api/api";
import { useToast } from "./ToastProvider";

type HBTTask = {
  id: number;
  title: string;
  description?: string | null;
  task_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  priority: "low" | "normal" | "high";
  status: "todo" | "in_progress" | "done" | "cancelled";
};

type TaskForm = {
  title: string;
  description: string;
  task_date: string;
  start_time: string;
  end_time: string;
  priority: "low" | "normal" | "high";
  status: "todo" | "in_progress" | "done" | "cancelled";
};

const emptyForm: TaskForm = {
  title: "",
  description: "",
  task_date: "",
  start_time: "",
  end_time: "",
  priority: "normal",
  status: "todo",
};

const statusMeta: Record<HBTTask["status"], { label: string; className: string }> = {
  todo: { label: "To do", className: "bg-slate-100 text-slate-700" },
  in_progress: { label: "Working", className: "bg-blue-100 text-blue-700" },
  done: { label: "Done", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

const priorityMeta: Record<HBTTask["priority"], { label: string; className: string }> = {
  low: { label: "Low", className: "bg-slate-100 text-slate-600" },
  normal: { label: "Normal", className: "bg-violet-100 text-violet-700" },
  high: { label: "High", className: "bg-amber-100 text-amber-700" },
};

const normalizeDate = (value?: string | null) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const normalizeTime = (value?: string | null) => {
  if (!value) return "";
  return String(value).slice(0, 5);
};

const formatTaskTime = (task: HBTTask) => {
  const date = normalizeDate(task.task_date);
  const start = normalizeTime(task.start_time);
  const end = normalizeTime(task.end_time);

  if (!date && !start) return "No time set";
  if (date && start && end) return `${date} · ${start} - ${end}`;
  if (date && start) return `${date} · ${start}`;
  if (date) return date;
  return start;
};

const isToday = (value?: string | null) => normalizeDate(value) === new Date().toISOString().slice(0, 10);

function HBTTaskScheduler() {
  const toast = useToast();
  const token = localStorage.getItem("token");
  const [tasks, setTasks] = useState<HBTTask[]>([]);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  );

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/hbt-tasks`, { headers });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to load scheduled tasks.");
        setTasks([]);
        return;
      }
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch {
      toast.error("Failed to load scheduled tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      today: tasks.filter((task) => isToday(task.task_date) && task.status !== "done" && task.status !== "cancelled").length,
      open: tasks.filter((task) => task.status === "todo" || task.status === "in_progress").length,
      done: tasks.filter((task) => task.status === "done").length,
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const statusOrder = { todo: 1, in_progress: 2, done: 3, cancelled: 4 } as Record<HBTTask["status"], number>;
      const priorityOrder = { high: 1, normal: 2, low: 3 } as Record<HBTTask["priority"], number>;
      const aDate = a.task_date ? new Date(a.task_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.task_date ? new Date(b.task_date).getTime() : Number.MAX_SAFE_INTEGER;
      return statusOrder[a.status] - statusOrder[b.status] || aDate - bDate || priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [tasks]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingTaskId(null);
  };

  const startEdit = (task: HBTTask) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title || "",
      description: task.description || "",
      task_date: normalizeDate(task.task_date),
      start_time: normalizeTime(task.start_time),
      end_time: normalizeTime(task.end_time),
      priority: task.priority || "normal",
      status: task.status || "todo",
    });
  };

  const saveTask = async () => {
    if (form.title.trim().length < 2) {
      toast.warning("Task title is required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/hbt-tasks${editingTaskId ? `/${editingTaskId}` : ""}`, {
        method: editingTaskId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.message || "Failed to save task.");
        return;
      }
      toast.success(editingTaskId ? "Task updated." : "Task created.");
      resetForm();
      await loadTasks();
    } catch {
      toast.error("Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (task: HBTTask, status: HBTTask["status"]) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/hbt-tasks/${task.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...task, task_date: normalizeDate(task.task_date), start_time: normalizeTime(task.start_time), end_time: normalizeTime(task.end_time), status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.message || "Failed to update task.");
        return;
      }
      await loadTasks();
    } catch {
      toast.error("Failed to update task.");
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (task: HBTTask) => {
    if (!window.confirm(`Delete task: ${task.title}?`)) return;
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/hbt-tasks/${task.id}`, { method: "DELETE", headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.message || "Failed to delete task.");
        return;
      }
      toast.success("Task deleted.");
      if (editingTaskId === task.id) resetForm();
      await loadTasks();
    } catch {
      toast.error("Failed to delete task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="premium-card">
      <div className="mb-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <div>
          <p className="eyebrow">Personal task schedule</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">My scheduled tasks</h2>
          <p className="mt-1 text-sm text-slate-500">Create, update, complete, or delete your own advisor tasks.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              ["Total", stats.total],
              ["Today", stats.today],
              ["Open", stats.open],
              ["Done", stats.done],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-black text-slate-950">{value}</p>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-black text-slate-950">{editingTaskId ? "Update task" : "Create task"}</h3>
            {editingTaskId && <button onClick={resetForm} className="text-xs font-black text-slate-500 hover:text-slate-950">Cancel edit</button>}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input className="form-field md:col-span-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title, e.g. Follow up with Isabella" />
            <input type="date" className="form-field" value={form.task_date} onChange={(e) => setForm({ ...form, task_date: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input type="time" className="form-field" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              <input type="time" className="form-field" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
            <select className="form-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskForm["priority"] })}>
              <option value="low">Low priority</option>
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
            </select>
            <select className="form-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskForm["status"] })}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <textarea className="form-field min-h-20 md:col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes or reminder details" />
          </div>

          <button disabled={saving} onClick={saveTask} className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Saving..." : editingTaskId ? "Update Task" : "Create Task"}
          </button>
        </div>
      </div>

      <div className="grid max-h-[360px] gap-3 overflow-y-auto pr-1">
        {loading ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Loading tasks...</p>
        ) : visibleTasks.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No scheduled tasks yet. Create your first task above.</p>
        ) : (
          visibleTasks.map((task) => (
            <article key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-lg font-black ${task.status === "done" ? "text-slate-400 line-through" : "text-slate-950"}`}>{task.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusMeta[task.status]?.className || statusMeta.todo.className}`}>{statusMeta[task.status]?.label || task.status}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${priorityMeta[task.priority]?.className || priorityMeta.normal.className}`}>{priorityMeta[task.priority]?.label || task.priority}</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-violet-700">{formatTaskTime(task)}</p>
                  {task.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{task.description}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {task.status !== "done" && (
                    <button disabled={saving} onClick={() => updateTaskStatus(task, "done")} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Done</button>
                  )}
                  {task.status === "todo" && (
                    <button disabled={saving} onClick={() => updateTaskStatus(task, "in_progress")} className="rounded-full bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Start</button>
                  )}
                  <button disabled={saving} onClick={() => startEdit(task)} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50">Edit</button>
                  <button disabled={saving} onClick={() => deleteTask(task)} className="rounded-full bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200 disabled:opacity-50">Delete</button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default HBTTaskScheduler;
