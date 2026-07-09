import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";

const dashboardImage =
  "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1400&q=80";

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
    { title: "Employer Partnerships", icon: "🏢", description: "View employer branded pages assigned to your Home Buying Team.", link: "/hbt/companies", accent: "from-blue-500 to-cyan-500" },
    { title: "Employees", icon: "👥", description: "View employees, assign leads to team members, and track progress.", link: "/hbt/employees", accent: "from-indigo-500 to-purple-500" },
    { title: "Messages", icon: "💬", description: "Use Communication Center for employee, company, advisor, and admin support conversations.", link: "/hbt/messages", accent: "from-violet-600 to-fuchsia-600" },
    { title: "Team Members", icon: "🤝", description: "Manage mortgage advisors, realtors, planners, and contact details.", link: "/hbt/team-members", accent: "from-emerald-500 to-teal-500" },
    { title: "Resources", icon: "📚", description: "Curate guides, checklists, and tools for employees.", link: "/hbt/resources", accent: "from-amber-500 to-orange-500" },
    { title: "Quiz Submissions", icon: "🧠", description: "Review readiness quiz answers and prioritize warm follow-ups.", link: "/hbt/quiz-submissions", accent: "from-pink-500 to-rose-500" },
    { title: "Events", icon: "📅", description: "Promote Lunch & Learns, webinars, and education sessions.", link: "/hbt/events", accent: "from-slate-700 to-slate-950" },
    { title: "Courses", icon: "🎓", description: "Manage course content and structured employee learning paths.", link: "/hbt/courses", accent: "from-cyan-500 to-blue-600" },
    { title: "Reports", icon: "📈", description: "Export partnership, employee engagement, and readiness reports.", link: "/hbt/reports", accent: "from-blue-600 to-violet-600" },
  ];

  const workflowCards = [
    { label: "Lead follow-up", title: "Prioritize employees", text: "Start with assigned employees, quiz signals, and message threads that need attention.", link: "/hbt/employees", cta: "Open employees" },
    { label: "Communication", title: "Keep conversations moving", text: "Use messages as the single support channel for employees and company managers.", link: "/hbt/messages", cta: "Open messages" },
    { label: "Education", title: "Push helpful content", text: "Refresh resources, events, and courses so employees always have the next best step.", link: "/hbt/resources", cta: "Manage resources" },
  ];

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="theme-panel relative overflow-hidden">
          <img src={dashboardImage} alt="Team meeting" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-indigo-950/95 to-violet-950/70" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Home Buying Team Control Center</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">HBT Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">
              Welcome, <strong className="text-white">{user.full_name || "HBT Member"}</strong>. Manage partnerships, employees, communication, resources, events, reports, and readiness from one command center.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Unread Updates", String(unreadCount), "text-red-700"],
            ["Core Modules", String(cards.length), "text-violet-700"],
            ["Pipeline", "Active", "text-blue-700"],
            ["Support", "Messages", "text-emerald-700"],
          ].map(([label, value, tone]) => (
            <div key={label} className="metric-card">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <h2 className={`mt-2 text-3xl font-black ${tone}`}>{value}</h2>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {workflowCards.map((item) => (
            <Link key={item.label} to={item.link} className="premium-card group block transition hover:-translate-y-1 hover:shadow-2xl">
              <p className="eyebrow">{item.label}</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{item.title}</h2>
              <p className="mt-3 min-h-[64px] text-sm leading-relaxed text-slate-600">{item.text}</p>
              <p className="mt-5 text-sm font-black text-violet-700">{item.cta} →</p>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.title} to={card.link} className="group overflow-hidden rounded-[1.75rem] bg-white shadow-lg shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl">
              <div className={`h-1.5 bg-gradient-to-r ${card.accent}`} />
              <div className="p-5">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl transition group-hover:scale-110">{card.icon}</div>
                <h2 className="text-xl font-black text-slate-950">{card.title}</h2>
                <p className="mt-3 min-h-[54px] text-sm leading-relaxed text-slate-600">{card.description}</p>
                <p className="mt-4 text-sm font-black text-violet-700">Open module →</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTDashboard;