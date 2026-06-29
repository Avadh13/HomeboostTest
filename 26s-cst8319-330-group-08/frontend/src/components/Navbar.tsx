import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  team_id?: number | null;
  partnership_id?: number | null;
  photo_url?: string | null;
};

type NavLinkItem = {
  to: string;
  label: string;
  shortLabel?: string;
};

const initials = (name?: string) => (name || "User").trim().charAt(0).toUpperCase() || "U";

function Navbar() {
  const [open, setOpen] = useState(false);
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setOpen(false);
    navigate("/login");
  };

  const publicLinks: NavLinkItem[] = [
    { to: "/", label: "Home" },
    { to: "/pricing", label: "Pricing" },
    { to: "/partners", label: "Employer Portals", shortLabel: "Portals" },
    { to: "/contact", label: "Contact" },
  ];

  const employeeLinks: NavLinkItem[] = [
    { to: "/employee-portal", label: "Portal" },
    { to: "/resources", label: "Resources" },
    { to: "/employee/messages", label: "Messages" },
    { to: "/employee/appointments", label: "Appointments", shortLabel: "Appts" },
    { to: "/notifications", label: "Notifications", shortLabel: "Alerts" },
    { to: "/profile", label: "Profile" },
  ];

  const companyLinks: NavLinkItem[] = [
    { to: "/company/dashboard", label: "Dashboard", shortLabel: "Dash" },
    { to: "/company/dashboard", label: "Employees" },
    { to: "/company/messages", label: "Messages" },
    { to: "/notifications", label: "Notifications", shortLabel: "Alerts" },
    { to: "/profile", label: "Profile" },
  ];

  const hbtAdminLinks: NavLinkItem[] = [
    { to: "/hbt/dashboard", label: "Dashboard", shortLabel: "Dash" },
    { to: "/hbt/companies", label: "Companies" },
    { to: "/hbt/employees", label: "Employees" },
    { to: "/hbt/messages", label: "Messages" },
    { to: "/notifications", label: "Notifications", shortLabel: "Alerts" },
    { to: "/profile", label: "Profile" },
  ];

  const hbtMemberLinks: NavLinkItem[] = [
    { to: "/hbt/member-dashboard", label: "Dashboard", shortLabel: "Dash" },
    { to: "/hbt/messages", label: "Messages" },
    { to: "/notifications", label: "Notifications", shortLabel: "Alerts" },
    { to: "/hbt/appointments", label: "Appointments", shortLabel: "Appts" },
    { to: "/hbt/availability", label: "Availability", shortLabel: "Hours" },
    { to: "/profile", label: "Profile" },
  ];

  const adminLinks: NavLinkItem[] = [
    { to: "/admin", label: "Admin" },
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

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/70 bg-white/85 shadow-sm shadow-slate-200/60 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <Link to="/" className="group flex min-w-0 items-center gap-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-base font-black text-white shadow-lg shadow-blue-500/30 transition group-hover:-translate-y-0.5 group-hover:shadow-xl md:h-12 md:w-12 md:text-lg">
            HB
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </span>

          <div className="min-w-0 leading-tight">
            <p className="truncate text-xl font-black tracking-tight text-slate-950 md:text-2xl">HomeBoost</p>
            <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 md:text-xs md:tracking-[0.26em]">Employee Benefit</p>
          </div>
        </Link>

        <div className="hide-scrollbar hidden max-w-[46vw] items-center gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white/70 p-1 text-xs font-bold text-slate-700 shadow-sm lg:flex xl:max-w-none xl:text-sm">
          {links.map((link) => (
            <Link key={`${link.to}-${link.label}`} to={link.to} title={link.label} className={`whitespace-nowrap rounded-full px-3 py-2 transition xl:px-4 ${isActive(link.to) ? "bg-blue-50 text-blue-700 shadow-sm" : "hover:bg-slate-50 hover:text-blue-700"}`}>
              <span className="xl:hidden">{link.shortLabel || link.label}</span>
              <span className="hidden xl:inline">{link.label}</span>
            </Link>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-2 lg:flex xl:gap-3">
          {!isLoggedIn ? (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100 hover:text-blue-700 xl:px-5 xl:py-2.5">Login</Link>
              <Link to="/partners" className="btn-primary px-4 py-2.5 text-sm xl:px-6"><span className="xl:hidden">Portals</span><span className="hidden xl:inline">Find Employer Portal</span></Link>
            </>
          ) : (
            <>
              <Link to={user?.role === "admin" || user?.role === "super_admin" ? "/admin/profile" : "/profile"} className="flex max-w-[210px] items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-right shadow-sm transition hover:border-blue-200 hover:bg-blue-50 xl:max-w-[260px] xl:px-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-black text-blue-700 ring-1 ring-blue-200">
                  {user?.photo_url ? <img src={user.photo_url} alt={user.full_name} className="h-full w-full object-cover" /> : initials(user?.full_name)}
                </span>
                <span className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{user?.full_name}</p>
                  <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">{user?.role?.replace("_", " ")}</p>
                </span>
              </Link>
              <button onClick={handleLogout} className="btn-danger px-4 py-2.5 text-sm xl:px-5">Logout</button>
            </>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="touch-target rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-900/20 lg:hidden">
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-slate-100 bg-white/95 px-4 py-4 shadow-xl backdrop-blur-xl lg:hidden">
          {isLoggedIn && <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="font-black text-slate-950">{user?.full_name}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{user?.role?.replace("_", " ")}</p></div>}
          <div className="grid gap-2">
            {links.map((link) => <Link key={`${link.to}-${link.label}`} to={link.to} onClick={() => setOpen(false)} className={`block rounded-2xl px-4 py-3 font-black transition ${isActive(link.to) ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}>{link.label}</Link>)}
            {!isLoggedIn ? (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 font-black text-slate-700 hover:bg-blue-50">Login</Link>
                <Link to="/partners" onClick={() => setOpen(false)} className="block rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-center font-black text-white">Find Employer Portal</Link>
              </>
            ) : <button onClick={handleLogout} className="block w-full rounded-2xl bg-red-600 px-4 py-3 text-center font-black text-white">Logout</button>}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
