import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";

type User = {
  full_name?: string;
  email?: string;
  role?: string;
};

function HBTDashboard() {
  const [unreadCount, setUnreadCount] = useState(0);
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");
  const user: User = userData ? JSON.parse(userData) : {};

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`${API_BASE_URL}/notifications/unread-count`, { headers })
      .then((res) => res.json())
      .then((payload) => setUnreadCount(Number(payload.unread_count || 0)))
      .catch(() => setUnreadCount(0));
  }, [token]);

  const cards = [
    { title: "Employer Partnerships", description: "View approved employers and onboarding requests for your Home Buying Team.", link: "/hbt/companies" },
    { title: "Employees", description: "View partnership employees, assignments, readiness, and progress.", link: "/hbt/employees" },
    { title: "Messages", description: "Open the Communication Center for employee support conversations.", link: "/hbt/messages" },
    { title: "Team Members", description: "Manage active HBT Members and one-time account activation.", link: "/hbt/team-members" },
    { title: "Resources", description: "Manage the guides and tools available to your team and partnerships.", link: "/hbt/resources" },
    { title: "Quiz Submissions", description: "Review submitted readiness information within your permitted team scope.", link: "/hbt/quiz-submissions" },
    { title: "Events", description: "Manage education events available to your Home Buying Team.", link: "/hbt/events" },
    { title: "Courses", description: "Open current course content and learning management tools.", link: "/hbt/courses" },
    { title: "Reports", description: "Open the reporting tools available for your team scope.", link: "/hbt/reports" },
  ];

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="eyebrow">Home Buying Team</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">HBT Dashboard</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">
                Welcome, <strong>{user.full_name || "HBT user"}</strong>. Use the live modules below to manage your assigned employers, employees, resources, communication, and reporting.
              </p>
            </div>
            <Link to="/notifications" className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-center">
              <p className="text-3xl font-black text-blue-700">{unreadCount}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wide text-blue-600">Unread notifications</p>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <Link key={card.title} to={card.link} className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">{index + 1}</div>
              <h2 className="mt-4 text-xl font-black text-slate-950">{card.title}</h2>
              <p className="mt-3 min-h-[54px] text-sm leading-relaxed text-slate-600">{card.description}</p>
              <p className="mt-4 text-sm font-black text-blue-700">Open →</p>
            </Link>
          ))}
        </section>
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTDashboard;
