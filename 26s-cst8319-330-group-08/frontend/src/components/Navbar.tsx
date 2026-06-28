import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  team_id?: number | null;
  partnership_id?: number | null;
};

type NavLinkItem = {
  to: string;
  label: string;
};

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
    { to: "/partners", label: "Employer Portals" },
    { to: "/contact", label: "Contact" },
  ];

  const employeeLinks: NavLinkItem[] = [
    { to: "/employee-portal", label: "Portal" },
    { to: "/resources", label: "Resources" },
    { to: "/employee/messages", label: "Messages" },
    { to: "/employee/appointments", label: "Appointments" },
  ];

  const hbtAdminLinks: NavLinkItem[] = [
    { to: "/hbt/dashboard", label: "Dashboard" },
    { to: "/hbt/companies", label: "Companies" },
    { to: "/hbt/employees", label: "Employees" },
    { to: "/hbt/team-members", label: "Team" },
    { to: "/hbt/resources", label: "Resources" },
    { to: "/hbt/events", label: "Events" },
  ];

  const hbtMemberLinks: NavLinkItem[] = [
    { to: "/hbt/member-dashboard", label: "Dashboard" },
    { to: "/hbt/appointments", label: "Appointments" },
    { to: "/hbt/availability", label: "Availability" },
    { to: "/hbt/messages", label: "Messages" },
  ];

  const adminLinks: NavLinkItem[] = [
    { to: "/admin", label: "Admin" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/hbts", label: "HBTs" },
    { to: "/admin/resources", label: "Resources" },
  ];

  const getLinks = () => {
    if (!isLoggedIn) return publicLinks;

    if (user?.role === "employee") return employeeLinks;
    if (user?.role === "hbt_admin") return hbtAdminLinks;
    if (user?.role === "hbt_member") return hbtMemberLinks;

    if (user?.role === "admin" || user?.role === "super_admin") {
      return adminLinks;
    }

    return publicLinks;
  };

  const links = getLinks();

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/70 bg-white/80 shadow-sm shadow-slate-200/60 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-6">
        <Link to="/" className="group flex items-center gap-3">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-lg font-black text-white shadow-lg shadow-blue-500/30 transition group-hover:-translate-y-0.5 group-hover:shadow-xl">
            HB
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </span>

          <div className="leading-tight">
            <p className="text-2xl font-black tracking-tight text-slate-950">HomeBoost</p>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-blue-600">Employee Benefit</p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white/70 p-1 text-[15px] font-bold text-slate-700 shadow-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-full px-4 py-2 transition ${isActive(link.to) ? "bg-blue-50 text-blue-700 shadow-sm" : "hover:bg-slate-50 hover:text-blue-700"}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {!isLoggedIn ? (
            <>
              <Link
                to="/login"
                className="rounded-full px-5 py-2.5 font-black text-slate-700 transition hover:bg-slate-100 hover:text-blue-700"
              >
                Login
              </Link>

              <Link to="/partners" className="btn-primary px-6 py-3">
                Find Employer Portal
              </Link>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-right shadow-sm">
                <p className="text-sm font-black text-slate-900">{user?.full_name}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {user?.role?.replace("_", " ")}
                </p>
              </div>

              <button onClick={handleLogout} className="btn-danger px-5 py-2.5">
                Logout
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="rounded-full bg-slate-950 px-5 py-2.5 font-black text-white shadow-lg shadow-slate-900/20 md:hidden"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white/95 px-5 py-5 shadow-xl backdrop-blur-xl md:hidden">
          <div className="space-y-3">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`block rounded-2xl px-4 py-3 font-black transition ${isActive(link.to) ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}
              >
                {link.label}
              </Link>
            ))}

            {!isLoggedIn ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3 font-black text-slate-700 hover:bg-blue-50"
                >
                  Login
                </Link>

                <Link
                  to="/partners"
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-center font-black text-white"
                >
                  Find Employer Portal
                </Link>
              </>
            ) : (
              <button onClick={handleLogout} className="block w-full rounded-2xl bg-red-600 px-4 py-3 text-center font-black text-white">
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
