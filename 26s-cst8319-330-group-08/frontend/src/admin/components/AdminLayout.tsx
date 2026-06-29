import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";

type AdminLayoutProps = {
  title?: string;
  children: ReactNode;
};

type NavItem = {
  path: string;
  label: string;
  icon: string;
  group: "Core" | "Operations" | "Content" | "Communication";
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

  const navLinks: NavItem[] = [
    { path: "/admin", label: "Dashboard", icon: "⌂", group: "Core" },
    { path: "/admin/profile", label: "My Profile", icon: "◌", group: "Core" },
    { path: "/admin/notifications", label: "Notifications", icon: "◉", group: "Core" },
    { path: "/admin/builder", label: "Builder Mode", icon: "▣", group: "Core" },
    { path: "/admin/hbts", label: "Home Buying Teams", icon: "◈", group: "Operations" },
    { path: "/admin/partnerships", label: "Partnerships", icon: "◇", group: "Operations" },
    { path: "/admin/appointments", label: "Appointments", icon: "◷", group: "Operations" },
    { path: "/admin/users", label: "Users", icon: "♙", group: "Operations" },
    { path: "/admin/resources", label: "Resources", icon: "▤", group: "Content" },
    { path: "/admin/pages", label: "Pages", icon: "◫", group: "Content" },
    { path: "/admin/sections", label: "Sections", icon: "▥", group: "Content" },
    { path: "/admin/cards", label: "Cards", icon: "▦", group: "Content" },
    { path: "/admin/pricing", label: "Pricing", icon: "$", group: "Content" },
    { path: "/admin/faqs", label: "FAQs", icon: "?", group: "Content" },
    { path: "/admin/quizzes", label: "Quizzes", icon: "✦", group: "Content" },
    { path: "/admin/quiz-submissions", label: "Quiz Submissions", icon: "✓", group: "Communication" },
    { path: "/admin/messages", label: "Communication Center", icon: "✉", group: "Communication" },
    { path: "/admin/contact-messages", label: "Contact Forms", icon: "☏", group: "Communication" },
  ];

  const groupedLinks = useMemo(() => {
    return navLinks.reduce<Record<NavItem["group"], NavItem[]>>(
      (groups, item) => {
        groups[item.group].push(item);
        return groups;
      },
      { Core: [], Operations: [], Content: [], Communication: [] }
    );
  }, []);

  const quickRail = [
    { path: "/admin", label: "Home", icon: "⌂" },
    { path: "/admin/profile", label: "Profile", icon: "◌" },
    { path: "/admin/resources", label: "Assets", icon: "▤" },
    { path: "/admin/messages", label: "Messages", icon: "✉" },
    { path: "/admin/notifications", label: "Alerts", icon: "◉" },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f8] text-slate-950">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
        <Link to="/admin" className="flex items-center gap-2 text-lg font-black text-slate-950">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm text-white">HB</span>
          HomeBoost Admin
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">
          {sidebarOpen ? "Close" : "Menu"}
        </button>
      </header>

      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center border-r border-slate-200 bg-white py-4 lg:flex">
          <Link to="/admin" className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white shadow-md shadow-violet-500/20">HB</Link>

          <nav className="flex flex-1 flex-col items-center gap-2">
            {quickRail.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                title={item.label}
                className={({ isActive }) => `flex h-10 w-10 items-center justify-center rounded-xl text-base font-black transition ${isActive ? "bg-indigo-50 text-violet-700 shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-violet-700"}`}
              >
                {item.icon}
              </NavLink>
            ))}
          </nav>

          <button onClick={handleLogout} title="Logout" className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-base font-black text-red-600 hover:bg-red-100">⏻</button>
        </aside>

        <aside className={`fixed left-0 top-0 z-50 flex h-screen w-72 transform flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:sticky lg:left-16 lg:z-30 lg:translate-x-0 lg:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="border-b border-slate-200 p-4">
            <div className="rounded-xl bg-slate-100 p-1.5">
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-[11px] font-black text-white">HB</span><div><p className="text-sm font-black leading-tight text-slate-950">HomeBoost</p><p className="text-[11px] font-bold text-slate-500">Client Control Panel</p></div></div>
                <span className="text-sm text-slate-400">⌄</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {(Object.keys(groupedLinks) as NavItem["group"][]).map((group) => (
              <div key={group} className="mb-4">
                <p className="mb-1.5 px-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{group}</p>
                <div className="space-y-1">
                  {groupedLinks[group].map((link) => (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      end={link.path === "/admin"}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `flex items-center justify-between rounded-xl px-2.5 py-2.5 text-sm font-bold transition ${isActive ? "bg-indigo-50 text-violet-700" : "text-slate-700 hover:bg-slate-50 hover:text-violet-700"}`}
                    >
                      <span className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-black shadow-sm ring-1 ring-slate-100">{link.icon}</span><span>{link.label}</span></span>
                      {link.label === "Contact Forms" && unreadCount > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{unreadCount}</span>}
                      {link.label === "Notifications" && unreadNotifications > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{unreadNotifications}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-200 p-3">
            <Link to="/" onClick={() => setSidebarOpen(false)} className="mb-2 block w-full rounded-xl bg-indigo-50 px-3 py-2.5 text-center text-sm font-black text-violet-700 hover:bg-indigo-100">View Website</Link>
            <button onClick={handleLogout} className="w-full rounded-xl bg-red-600 px-3 py-2.5 text-sm font-black text-white hover:bg-red-700">Logout</button>
          </div>
        </aside>

        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}

        <main className="min-h-screen flex-1 overflow-hidden">
          <div className="border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl lg:px-7">
            <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 md:flex-row md:items-center">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-violet-500">Admin Workspace</p><h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">{title || "Dashboard"}</h1></div>
              <div className="flex flex-wrap gap-2"><Link to="/admin/profile" className="rounded-full bg-slate-100 px-3.5 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">My Profile</Link><Link to="/admin/sections" className="rounded-full bg-slate-100 px-3.5 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">CMS Editor</Link><Link to="/admin/partnerships" className="rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-violet-500/20">New Partnership</Link></div>
            </div>
          </div>

          <div className="px-5 py-5 lg:px-7 lg:py-6"><div className="mx-auto max-w-7xl">{children}</div></div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
