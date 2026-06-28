import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";

type AdminLayoutProps = {
  title?: string;
  children: ReactNode;
};

function AdminLayout({ title, children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };

    const fetchUnreadMessages = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/contact`, { headers });
        const data = await response.json();
        if (Array.isArray(data)) {
          setUnreadCount(data.filter((message) => !message.is_read).length);
        }
      } catch {
        console.log("Failed to load unread messages");
      }
    };

    const fetchUnreadNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, { headers });
        const data = await response.json();
        setUnreadNotifications(Number(data.unread_count || 0));
      } catch {
        setUnreadNotifications(0);
      }
    };

    if (token) {
      fetchUnreadMessages();
      fetchUnreadNotifications();
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navLinks = [
    { path: "/admin", label: "Dashboard" },
    { path: "/notifications", label: "Notifications" },
    { path: "/admin/builder", label: "Builder Mode" },
    { path: "/admin/hbts", label: "Home Buying Teams" },
    { path: "/admin/partnerships", label: "Partnerships" },
    { path: "/admin/appointments", label: "Appointments" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/resources", label: "Resources" },
    { path: "/admin/pages", label: "Pages" },
    { path: "/admin/sections", label: "Sections" },
    { path: "/admin/cards", label: "Cards" },
    { path: "/admin/pricing", label: "Pricing" },
    { path: "/admin/contact-messages", label: "Messages" },
    { path: "/admin/faqs", label: "FAQs" },
    { path: "/admin/quizzes", label: "Quizzes" },
    { path: "/admin/quiz-submissions", label: "Quiz Submissions" },
  ];

  return (
    <div className="theme-page">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/70 bg-white/85 px-4 py-4 shadow backdrop-blur-xl lg:hidden">
        <Link to="/admin" className="text-2xl font-black text-slate-950">HomeBoost Admin</Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-full bg-slate-950 px-4 py-2 font-black text-white">
          {sidebarOpen ? "Close" : "Menu"}
        </button>
      </header>

      <div className="flex">
        <aside className={`fixed left-0 top-0 z-40 flex h-screen w-72 transform flex-col border-r border-violet-100 bg-white/95 shadow-xl shadow-violet-200/40 backdrop-blur-xl transition-transform duration-300 lg:sticky ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
          <div className="shrink-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-white">
            <Link to="/admin" className="text-2xl font-black text-white">HomeBoost</Link>
            <p className="mt-1 text-sm font-bold text-violet-100">Client Control Panel</p>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === "/admin"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-2xl px-4 py-3 font-bold transition ${
                    isActive ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                  }`
                }
              >
                <span>{link.label}</span>
                {link.label === "Messages" && unreadCount > 0 && <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">{unreadCount}</span>}
                {link.label === "Notifications" && unreadNotifications > 0 && <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">{unreadNotifications}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="shrink-0 border-t border-violet-100 bg-white p-4">
            <Link to="/" onClick={() => setSidebarOpen(false)} className="mb-3 block w-full rounded-2xl bg-violet-50 px-4 py-3 text-center font-black text-violet-700 hover:bg-violet-100">
              View Website
            </Link>
            <button onClick={handleLogout} className="w-full rounded-2xl bg-red-600 px-4 py-3 font-black text-white hover:bg-red-700">
              Logout
            </button>
          </div>
        </aside>

        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black bg-opacity-40 lg:hidden" />}

        <main className="min-h-screen flex-1 p-6 lg:p-10">
          <div className="mx-auto max-w-7xl">
            {title && <h1 className="mb-6 text-3xl font-black tracking-tight">{title}</h1>}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
