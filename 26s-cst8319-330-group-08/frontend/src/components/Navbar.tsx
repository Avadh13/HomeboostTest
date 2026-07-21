import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API_BASE_URL from "../api/api";
import BrandLogo from "./BrandLogo";

type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  team_id?: number | null;
  partnership_id?: number | null;
  photo_url?: string | null;
};

type NavLinkItem = { to: string; label: string; shortLabel?: string };
type MessageThreadSummary = { unread_count?: number | string | null };

const initials = (name?: string) => (name || "User").trim().charAt(0).toUpperCase() || "U";
const formatBadge = (count: number) => (count > 99 ? "99+" : String(count));

function Navbar() {
  const [open, setOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  let user: User | null = null;
  try {
    user = userData ? JSON.parse(userData) : null;
  } catch {
    user = null;
  }

  const isLoggedIn = !!token && !!user;

  useEffect(() => {
    if (!isLoggedIn || !token) {
      setUnreadAlerts(0);
      setUnreadMessages(0);
      return;
    }

    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };

    const loadBadges = async () => {
      try {
        const [notificationsResponse, messagesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/notifications/unread-count`, { headers }),
          fetch(`${API_BASE_URL}/messages/threads`, { headers }),
        ]);

        if (cancelled) return;

        if (notificationsResponse.ok) {
          const data = await notificationsResponse.json();
          setUnreadAlerts(Number(data.unread_count || 0));
        }

        if (messagesResponse.ok) {
          const threads = await messagesResponse.json();
          const unreadTotal = Array.isArray(threads)
            ? threads.reduce((sum: number, thread: MessageThreadSummary) => sum + Number(thread.unread_count || 0), 0)
            : 0;
          setUnreadMessages(unreadTotal);
        }
      } catch {
        // Badge refresh is non-critical.
      }
    };

    loadBadges();
    const timer = window.setInterval(loadBadges, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isLoggedIn, token, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setOpen(false);
    navigate("/login");
  };

  const publicLinks: NavLinkItem[] = [
    { to: "/", label: "Program" },
    { to: "/hbt-signup", label: "Sign Up" },
    { to: "/contact", label: "Contact" },
  ];

  const employeeLinks: NavLinkItem[] = [
    { to: "/employee-portal", label: "Portal" },
    { to: "/employee/journey", label: "Journey" },
    { to: "/resources", label: "Resources" },
    { to: "/employee/messages", label: "Messages" },
    { to: "/notifications", label: "Notifications", shortLabel: "Alerts" },
  ];

  const companyLinks: NavLinkItem[] = [
    { to: "/company/dashboard", label: "Dashboard", shortLabel: "Dash" },
    { to: "/company/employer-approval", label: "Approval", shortLabel: "Approve" },
    { to: "/company/reports", label: "Reports" },
    { to: "/company/invites", label: "Invites" },
    { to: "/company/branding", label: "Branding" },
    { to: "/company/messages", label: "Messages" },
  ];

  const hbtAdminLinks: NavLinkItem[] = [
    { to: "/hbt/dashboard", label: "Dashboard", shortLabel: "Dash" },
    { to: "/hbt/reports", label: "Reports" },
    { to: "/hbt/qa", label: "QA" },
    { to: "/hbt/journeys", label: "Journeys" },
    { to: "/hbt/quiz-journey-rules", label: "Rules" },
    { to: "/hbt/employer-approvals", label: "Approvals", shortLabel: "Approvals" },
    { to: "/hbt/courses", label: "Courses" },
    { to: "/hbt/invites", label: "Invites" },
    { to: "/hbt/branding", label: "Branding" },
    { to: "/hbt/messages", label: "Messages" },
  ];

  const hbtMemberLinks: NavLinkItem[] = [
    { to: "/hbt/member-dashboard", label: "Dashboard", shortLabel: "Dash" },
    { to: "/hbt/reports", label: "Reports" },
    { to: "/hbt/courses", label: "Courses" },
    { to: "/hbt/messages", label: "Messages" },
    { to: "/notifications", label: "Notifications", shortLabel: "Alerts" },
  ];

  const adminLinks: NavLinkItem[] = [
    { to: "/admin", label: "Admin" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/qa", label: "QA" },
    { to: "/admin/messages", label: "Messages" },
    { to: "/admin/notifications", label: "Notifications", shortLabel: "Alerts" },
    { to: "/admin/profile", label: "Profile" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/hbts", label: "HBTs" },
  ];

  const getLinks = () => {
    if (!isLoggedIn) return publicLinks;
    if (user?.role === "employee") return employeeLinks;
    if (user?.role === "company_admin" || user?.role === "company") return companyLinks;
    if (user?.role === "hbt_admin") return hbtAdminLinks;
    if (user?.role === "hbt_member") return hbtMemberLinks;
    if (user?.role === "admin" || user?.role === "super_admin") return adminLinks;
    return publicLinks;
  };

  const links = getLinks();
  const isActive = (to: string) => (to === "/" ? location.pathname === "/" : location.pathname === to || location.pathname.startsWith(`${to}/`));
  const getBadgeCount = (link: NavLinkItem) => (link.to.includes("messages") ? unreadMessages : link.to.includes("notifications") ? unreadAlerts : 0);
  const renderBadge = (count: number, className = "") =>
    count > 0 ? <span className={`ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white ${className}`}>{formatBadge(count)}</span> : null;

  const profilePath = user?.role === "admin" || user?.role === "super_admin" ? "/admin/profile" : "/profile";

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/70 backdrop-blur-2xl">
      <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 lg:px-8">
        <Link to="/" className="group flex min-w-0 items-center justify-self-start" aria-label="HomeBoost home">
          <BrandLogo className="h-12 w-[220px] transition duration-200 group-hover:-translate-y-0.5 md:h-14 md:w-[260px]" />
        </Link>

        <div className="hide-scrollbar hidden max-w-[48vw] items-center gap-1 overflow-x-auto rounded-[28px] border border-slate-800/10 bg-slate-950/95 p-1.5 text-sm font-black text-white shadow-xl shadow-slate-900/15 lg:flex 2xl:max-w-none">
          {links.map((link) => {
            const badgeCount = getBadgeCount(link);
            const active = isActive(link.to);
            return (
              <Link
                key={`${link.to}-${link.label}`}
                to={link.to}
                title={link.label}
                className={`relative whitespace-nowrap rounded-full px-4 py-2.5 transition duration-200 xl:px-5 ${
                  active
                    ? "bg-white text-blue-700 shadow-lg shadow-blue-950/20"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="xl:hidden">{link.shortLabel || link.label}</span>
                <span className="hidden xl:inline">{link.label}</span>
                {renderBadge(badgeCount)}
              </Link>
            );
          })}
        </div>

        <div className="hidden shrink-0 items-center justify-self-end gap-3 lg:flex">
          {!isLoggedIn ? (
            <>
              <Link to="/login" className="rounded-full px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100 hover:text-blue-700 xl:px-5">
                Sign In
              </Link>
              <Link to="/hbt-signup" className="rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-blue-900/30">
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <Link to={profilePath} className="flex max-w-[250px] items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-right shadow-sm transition hover:border-blue-200 hover:bg-blue-50 xl:max-w-[300px]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-sm font-black text-blue-700 ring-1 ring-blue-200">
                  {user?.photo_url ? <img src={user.photo_url} alt={user.full_name} className="h-full w-full object-cover" /> : initials(user?.full_name)}
                </span>
                <span className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{user?.full_name}</p>
                  <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">{user?.role?.replace("_", " ")}</p>
                </span>
              </Link>
              <button onClick={handleLogout} className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-900/15 transition hover:-translate-y-0.5 hover:bg-red-700">
                Logout
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="touch-target justify-self-end rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-900/20 lg:hidden"
          aria-expanded={open}
          aria-label="Toggle navigation menu"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="max-h-[calc(100vh-78px)] overflow-y-auto border-t border-slate-100 bg-white/98 px-4 py-4 shadow-xl backdrop-blur-xl lg:hidden">
          <div className="grid gap-2">
            {links.map((link) => {
              const badgeCount = getBadgeCount(link);
              const active = isActive(link.to);
              return (
                <Link
                  key={`${link.to}-${link.label}`}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 font-black transition ${
                    active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <span>{link.label}</span>
                  {renderBadge(badgeCount, "ml-3 px-2 py-1 text-xs")}
                </Link>
              );
            })}

            {!isLoggedIn ? (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 font-black text-slate-700 hover:bg-blue-50">
                  Sign In
                </Link>
                <Link to="/hbt-signup" onClick={() => setOpen(false)} className="block rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-center font-black text-white">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <Link to={profilePath} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 font-black text-slate-800">
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-700">
                    {user?.photo_url ? <img src={user.photo_url} alt={user.full_name} className="h-full w-full object-cover" /> : initials(user?.full_name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{user?.full_name}</span>
                    <span className="block truncate text-xs uppercase tracking-wide text-slate-500">{user?.role?.replace("_", " ")}</span>
                  </span>
                </Link>
                <button onClick={handleLogout} className="block w-full rounded-2xl bg-red-600 px-4 py-3 text-center font-black text-white">
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
