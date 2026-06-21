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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchUnreadMessages = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/contact`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (Array.isArray(data)) {
          setUnreadCount(data.filter((message) => !message.is_read).length);
        }
      } catch {
        console.log("Failed to load unread messages");
      }
    };

    if (token) {
      fetchUnreadMessages();
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navLinks = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/builder", label: "Builder Mode" },
    { path: "/admin/hbts", label: "Home Buying Teams" },
    { path: "/admin/partnerships", label: "Partnerships" },
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
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white px-4 py-4 shadow lg:hidden">
        <Link to="/admin" className="text-2xl font-black text-gray-900">
          HomeBoost Admin
        </Link>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          {sidebarOpen ? "Close" : "Menu"}
        </button>
      </header>

      <div className="flex">
        <aside
          className={`fixed left-0 top-0 z-40 flex h-screen w-72 transform flex-col bg-white shadow-lg transition-transform duration-300 lg:sticky ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          <div className="shrink-0 border-b bg-gradient-to-br from-slate-950 to-blue-950 p-6 text-white">
            <Link to="/admin" className="text-2xl font-black text-white">
              HomeBoost
            </Link>
            <p className="mt-1 text-sm font-semibold text-blue-100">Client Control Panel</p>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === "/admin"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg px-4 py-3 font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                <span>{link.label}</span>

                {link.label === "Messages" && unreadCount > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="shrink-0 border-t bg-white p-4">
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className="mb-3 block w-full rounded-lg bg-gray-100 px-4 py-3 text-center font-medium text-gray-800 hover:bg-gray-200"
            >
              View Website
            </Link>

            <button
              onClick={handleLogout}
              className="w-full rounded-lg bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black bg-opacity-40 lg:hidden"
          />
        )}

        <main className="min-h-screen flex-1 p-6 lg:p-10">
          <div className="mx-auto max-w-7xl">
            {title && <h1 className="mb-6 text-3xl font-bold">{title}</h1>}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;