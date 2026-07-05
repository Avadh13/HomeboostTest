import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/api";

type Notification = {
  id: number;
  title: string;
  message?: string | null;
  link?: string | null;
  type: string;
  is_read: number;
  created_at: string;
};

type NotificationCenterProps = {
  embedded?: boolean;
};

const typeClasses: Record<string, string> = {
  appointment: "border-blue-200 bg-blue-50 text-blue-800",
  message: "border-indigo-200 bg-indigo-50 text-indigo-800",
  service_request: "border-violet-200 bg-violet-50 text-violet-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  system: "border-purple-200 bg-purple-50 text-purple-800",
  info: "border-slate-200 bg-slate-50 text-slate-800",
};

const typeIcons: Record<string, string> = {
  appointment: "📆",
  message: "💬",
  service_request: "🏡",
  success: "✓",
  warning: "!",
  system: "⚙",
  info: "i",
};

const getDashboardPath = (role?: string) => {
  if (role === "admin" || role === "super_admin") return "/admin";
  if (role === "hbt_admin") return "/hbt/dashboard";
  if (role === "hbt_member") return "/hbt/member-dashboard";
  if (role === "company_admin" || role === "company") return "/company/dashboard";
  if (role === "employee") return "/employee-portal";
  return "/";
};

function NotificationCenter({ embedded = false }: NotificationCenterProps) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, { headers });
      const data = await response.json();

      if (!response.ok) {
        if (!silent) {
          setNotice({ type: "error", message: data.message || "Could not load notifications." });
          setNotifications([]);
        }
        return;
      }

      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Notifications load failed:", error);
      if (!silent) setNotice({ type: "error", message: "Could not load notifications." });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(() => loadNotifications(true), 15_000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  const markRead = async (notification: Notification, shouldNavigate = false) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${notification.id}/read`, { method: "PUT", headers });
      setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, is_read: 1 } : item)));
      if (shouldNavigate && notification.link) navigate(notification.link);
    } catch (error) {
      console.error("Mark notification read failed:", error);
      setNotice({ type: "error", message: "Could not update notification." });
    }
  };

  const markAllRead = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, { method: "PUT", headers });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setNotice({ type: "error", message: data.message || "Could not mark notifications read." });
        return;
      }
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
      setNotice({ type: "success", message: "All notifications marked as read." });
    } catch (error) {
      console.error("Mark all read failed:", error);
      setNotice({ type: "error", message: "Could not mark notifications read." });
    }
  };

  const unreadCount = useMemo(() => notifications.filter((item) => Number(item.is_read) === 0).length, [notifications]);
  const pageClass = embedded ? "space-y-6" : "min-h-screen bg-slate-50 px-6 py-8";
  const containerClass = embedded ? "mx-auto max-w-7xl space-y-6" : "mx-auto max-w-5xl space-y-8";

  return (
    <main className={pageClass}>
      <div className={containerClass}>
        <header className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-6 text-white shadow-xl lg:p-8">
          {!embedded && <Link to={getDashboardPath(user.role)} className="text-sm font-bold text-blue-200 hover:text-white">← Back to dashboard</Link>}
          <div className={`${embedded ? "mt-0" : "mt-5"} flex flex-wrap items-end justify-between gap-4`}>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-200">Alerts Center</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Updates for {user.full_name || "your account"}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100 md:text-base">Messages, appointment requests, meeting links, advisor updates, and system activity appear here automatically.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur">
              <p className="text-4xl font-black">{unreadCount}</p>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">Unread</p>
            </div>
          </div>
        </header>

        {notice && <div className={`rounded-2xl border px-5 py-4 font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.message}</div>}

        <section className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Recent alerts</h2>
              <p className="text-sm text-slate-500">Newest updates first. This list refreshes automatically.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => loadNotifications()} className="rounded-full bg-slate-100 px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-200">Refresh</button>
              <button onClick={markAllRead} disabled={unreadCount === 0} className="rounded-full bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Mark all read</button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <div className="h-4 w-40 rounded bg-slate-200" />
                  <div className="mt-3 h-5 w-2/3 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-full rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-600">No alerts yet.</div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <article key={notification.id} className={`rounded-3xl border p-5 transition ${Number(notification.is_read) === 0 ? "bg-white shadow-md" : "bg-slate-50 opacity-75"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${typeClasses[notification.type] || typeClasses.info}`}>
                        {typeIcons[notification.type] || typeIcons.info}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${typeClasses[notification.type] || typeClasses.info}`}>{notification.type.replace("_", " ")}</span>
                          {Number(notification.is_read) === 0 && <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">New</span>}
                        </div>
                        <h3 className="mt-3 text-xl font-black text-slate-950">{notification.title}</h3>
                        {notification.message && <p className="mt-2 leading-relaxed text-slate-600">{notification.message}</p>}
                        <p className="mt-3 text-xs font-semibold text-slate-400">{new Date(notification.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Number(notification.is_read) === 0 && <button onClick={() => markRead(notification)} className="rounded-full bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-300">Mark read</button>}
                      {notification.link && <button onClick={() => markRead(notification, true)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Open</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default NotificationCenter;
