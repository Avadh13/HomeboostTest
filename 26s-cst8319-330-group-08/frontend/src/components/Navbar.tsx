import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  team_id?: number | null;
  partnership_id?: number | null;
};

function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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

  const publicLinks = [
    { to: "/", label: "Home" },
    { to: "/pricing", label: "Pricing" },
    { to: "/partners", label: "Employer Portals" },
    { to: "/contact", label: "Contact" },
  ];

  const employeeLinks = [
    { to: "/employee-portal", label: "Portal" },
    { to: "/resources", label: "Resources" },
    { to: "/quiz/1", label: "Quiz" },
  ];

  const hbtLinks = [
    { to: "/hbt/dashboard", label: "Dashboard" },
    { to: "/hbt/companies", label: "Companies" },
    { to: "/hbt/employees", label: "Employees" },
    { to: "/hbt/team-members", label: "Team" },
    { to: "/hbt/resources", label: "Resources" },
    { to: "/hbt/events", label: "Events" },
  ];

  const adminLinks = [
    { to: "/admin", label: "Admin" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/hbts", label: "HBTs" },
    { to: "/admin/resources", label: "Resources" },
  ];

  const getLinks = () => {
    if (!isLoggedIn) return publicLinks;

    if (user?.role === "employee") return employeeLinks;

    if (user?.role === "hbt_admin") return hbtLinks;

    if (user?.role === "admin" || user?.role === "super_admin") {
      return adminLinks;
    }

    return publicLinks;
  };

  const links = getLinks();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/85 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-lg font-black text-white shadow-lg shadow-blue-500/30">
            HB
          </span>

          <div>
            <p className="text-xl font-black tracking-tight text-slate-950">
              HomeBoost
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Employee Benefit
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-7 text-[15px] font-semibold text-slate-700 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="transition hover:text-blue-700"
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
                className="rounded-full px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Login
              </Link>

              <Link
                to="/partners"
                className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:scale-105"
              >
                Find Employer Portal
              </Link>
            </>
          ) : (
            <>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  {user?.full_name}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {user?.role?.replace("_", " ")}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white transition hover:bg-red-700"
              >
                Logout
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="rounded-full bg-slate-950 px-5 py-2.5 font-semibold text-white md:hidden"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white px-6 py-5 md:hidden">
          <div className="space-y-3">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                {link.label}
              </Link>
            ))}

            {!isLoggedIn ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3 font-semibold text-slate-700 hover:bg-blue-50"
                >
                  Login
                </Link>

                <Link
                  to="/partners"
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-center font-semibold text-white"
                >
                  Find Employer Portal
                </Link>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="block w-full rounded-2xl bg-red-600 px-4 py-3 text-center font-semibold text-white"
              >
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