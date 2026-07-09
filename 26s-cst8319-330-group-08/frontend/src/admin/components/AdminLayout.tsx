import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import BrandLogo from "../../components/BrandLogo";

type AdminLayoutProps = { title?: string; children: ReactNode };
type NavItem = { path: string; label: string; icon: string; group: "Core" | "Operations" | "Content" | "Communication" };

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
        if (Array.isArray(data)) setUnreadCount(data.filter((message) => !message.is_read).length);
      } catch { console.log("Failed to load unread messages"); }
    };
    const fetchUnreadNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, { headers });
        const data = await response.json();
        setUnreadNotifications(Number(data.unread_count || 0));
      } catch { setUnreadNotifications(0); }
    };
    if (token) { fetchUnreadMessages(); fetchUnreadNotifications(); }
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
    { path: "/admin/payments", label: "Payments", icon: "$", group: "Operations" },
    { path: "/admin/hbts", label: "Home Buying Teams", icon: "◈", group: "Operations" },
    { path: "/admin/partnerships", label: "Partnerships", icon: "◇", group: "Operations" },
    { path: "/admin/users", label: "Users", icon: "♙", group: "Operations" },
    { path: "/admin/service-requests", label: "Mortgage Requests", icon: "◍", group: "Operations" },
    { path: "/admin/resources", label: "Resources", icon: "▤", group: "Content" },
    { path: "/admin/mortgage-services", label: "Mortgage Services", icon: "⌁", group: "Content" },
    { path: "/admin/pages", label: "Pages", icon: "◫", group: "Content" },
    { path: "/admin/sections", label: "Sections", icon: "▥", group: "Content" },
    { path: "/admin/cards", label: "Cards", icon: "▦", group: "Content" },
    { path: "/admin/pricing", label: "Pricing", icon: "$", group: "Content" },
    { path: "/admin/footer", label: "Footer Builder", icon: "▧", group: "Content" },
    { path: "/admin/faqs", label: "FAQs", icon: "?", group: "Content" },
    { path: "/admin/quizzes", label: "Quizzes", icon: "✦", group: "Content" },
    { path: "/admin/quiz-submissions", label: "Quiz Submissions", icon: "✓", group: "Communication" },
    { path: "/admin/messages", label: "Communication Center", icon: "✉", group: "Communication" },
    { path: "/admin/contact-messages", label: "Contact Forms", icon: "☏", group: "Communication" },
  ];

  const groupedLinks = useMemo(() => navLinks.reduce<Record<NavItem["group"], NavItem[]>>((groups, item) => { groups[item.group].push(item); return groups; }, { Core: [], Operations: [], Content: [], Communication: [] }), []);
  const quickRail = [
    { path: "/admin", label: "Home", icon: "⌂" },
    { path: "/admin/payments", label: "Payments", icon: "$" },
    { path: "/admin/service-requests", label: "Requests", icon: "◍" },
    { path: "/admin/resources", label: "Assets", icon: "▤" },
    { path: "/admin/footer", label: "Footer", icon: "▧" },
    { path: "/admin/messages", label: "Messages", icon: "✉" },
    { path: "/admin/notifications", label: "Alerts", icon: "◉" },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f8] text-slate-950">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
        <Link to="/admin" className="flex items-center gap-2 text-lg font-black text-slate-950"><BrandLogo variant="icon" iconClassName="h-10 w-10 rounded-xl shadow-sm" />HomeBoost Admin</Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">{sidebarOpen ? "Close" : "Menu"}</button>
      </header>

      <div className="flex min-h-screen">
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-16 shrink-0 flex-col items-center border-r border-slate-200 bg-white py-4 lg:flex">
          <Link to="/admin" className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl shadow-md shadow-violet-500/20"><BrandLogo variant="icon" iconClassName="h-10 w-10 rounded-xl" /></Link>
          <nav className="flex flex-1 flex-col items-center gap-2">
            {quickRail.map((item) => <NavLink key={item.path} to={item.path} end={item.path === "/admin"} title={item.label} className={({ isActive }) => `flex h-10 w-10 items-center justify-center rounded-xl text-base font-black transition ${isActive ? "bg-indigo-50 text-violet-700 shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-violet-700"}`}>{item.icon}</NavLink>)}
          </nav>
          <button onClick={handleLogout} title="Logout" className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-base font-black text-red-600 hover:bg-red-100">⏻</button>
        </aside>

        <aside className={`${sidebarOpen ? "fixed inset-x-0 top-[65px] z-30 block max-h-[calc(100vh-65px)] overflow-y-auto" : "hidden"} border-r border-slate-200 bg-white p-4 shadow-xl lg:fixed lg:left-16 lg:top-0 lg:block lg:h-screen lg:w-72 lg:overflow-y-auto lg:p-5 lg:shadow-none`}>
          <div className="mb-6 hidden lg:block"><Link to="/admin" className="flex items-center gap-3"><BrandLogo variant="icon" iconClassName="h-12 w-12 rounded-2xl shadow-lg" /><div><p className="text-lg font-black text-slate-950">HomeBoost</p><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Admin Console</p></div></Link></div>
          <nav className="space-y-5">
            {(Object.keys(groupedLinks) as Array<NavItem["group"]>).map((group) => <div key={group}><p className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{group}</p><div className="space-y-1">{groupedLinks[group].map((item) => <NavLink key={item.path} to={item.path} end={item.path === "/admin"} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-black transition ${isActive ? "bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-100" : "text-slate-600 hover:bg-slate-50 hover:text-violet-700"}`}><span className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-sm">{item.icon}</span>{item.label}</span>{item.path === "/admin/contact-messages" && unreadCount > 0 ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">{unreadCount}</span> : null}{item.path === "/admin/notifications" && unreadNotifications > 0 ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">{unreadNotifications}</span> : null}</NavLink>)}</div></div>)}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 lg:ml-[22rem]">
          <div className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6 lg:px-8"><h1 className="text-2xl font-black text-slate-950">{title || "Admin"}</h1></div>
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;