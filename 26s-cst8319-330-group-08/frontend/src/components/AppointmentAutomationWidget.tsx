import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";

type Reminder = {
  id: number;
  appointment_id: number;
  reminder_type: string;
  due_at: string;
  status: string;
  topic?: string | null;
  employee_name?: string | null;
};

function AppointmentAutomationWidget() {
  const { pathname } = useLocation();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [running, setRunning] = useState(false);
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const shouldShow = Boolean(pathname === "/hbt/appointments" && ["hbt_admin", "hbt_member", "admin", "super_admin"].includes(user?.role) && token);

  const loadReminders = () => {
    if (!shouldShow) return;
    fetch(`${API_BASE_URL}/automation/appointment-reminders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => setReminders(Array.isArray(data.reminders) ? data.reminders : []))
      .catch(() => setReminders([]));
  };

  useEffect(() => {
    loadReminders();
  }, [shouldShow, token]);

  const runAutomation = async () => {
    try {
      setRunning(true);
      await fetch(`${API_BASE_URL}/automation/appointment-reminders/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadReminders();
    } finally {
      setRunning(false);
    }
  };

  if (!shouldShow) return null;

  const dueNow = reminders.filter((reminder) => reminder.status === "pending" && new Date(reminder.due_at).getTime() <= Date.now()).length;
  const pending = reminders.filter((reminder) => reminder.status === "pending").length;

  return (
    <aside className="fixed bottom-24 left-4 z-30 hidden w-[360px] rounded-[1.5rem] border border-indigo-100 bg-white p-4 shadow-2xl shadow-slate-900/15 xl:block">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Appointment automation</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Reminder engine</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">{pending} pending · {dueNow} due now</p>
        </div>
        <button disabled={running} onClick={runAutomation} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-60">
          {running ? "Running..." : "Run"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-indigo-50 p-3"><p className="text-xl font-black text-indigo-700">{pending}</p><p className="text-[10px] font-black uppercase text-indigo-700">Pending</p></div>
        <div className="rounded-2xl bg-red-50 p-3"><p className="text-xl font-black text-red-700">{dueNow}</p><p className="text-[10px] font-black uppercase text-red-700">Due</p></div>
      </div>

      <div className="mt-3 space-y-2">
        {reminders.slice(0, 3).map((reminder) => (
          <div key={reminder.id} className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
            <p className="line-clamp-1 font-black text-slate-950">{reminder.employee_name || "Employee"}</p>
            <p className="mt-1">{reminder.reminder_type.replace(/_/g, " ")} · {reminder.status}</p>
          </div>
        ))}
        {reminders.length === 0 && <p className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">No reminders planned yet. Plan reminders from the automation API after appointments are created.</p>}
      </div>
    </aside>
  );
}

export default AppointmentAutomationWidget;
