import { Link, useNavigate } from "react-router-dom";
import ChatWidget from "../components/ChatWidget";
const dashboardImage =
  "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1400&q=80";

type User = {
  full_name?: string;
  email?: string;
  role?: string;
};

function HBTDashboard() {
  const navigate = useNavigate();

  const userData = localStorage.getItem("user");
  const user: User = userData ? JSON.parse(userData) : {};

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const cards = [
    { title: "Employer Partnerships", icon: "🏢", description: "View employer branded pages assigned to your Home Buying Team.", link: "/hbt/companies", accent: "from-blue-500 to-cyan-500" },
    { title: "Employees", icon: "👥", description: "View employees, quiz activity, interest level, and engagement.", link: "/hbt/employees", accent: "from-indigo-500 to-purple-500" },
    { title: "Appointments", icon: "📆", description: "Review employee appointment requests and manage follow-up status.", link: "/hbt/appointments", accent: "from-green-500 to-emerald-600" },
    { title: "Team Members", icon: "🤝", description: "Manage mortgage advisors, realtors, planners, and booking links.", link: "/hbt/team-members", accent: "from-emerald-500 to-teal-500" },
    { title: "Resources", icon: "📚", description: "Curate guides, checklists, and tools for employees.", link: "/hbt/resources", accent: "from-amber-500 to-orange-500" },
    { title: "Quiz Submissions", icon: "🧠", description: "Review readiness quiz answers and prioritize warm follow-ups.", link: "/hbt/quiz-submissions", accent: "from-pink-500 to-rose-500" },
    { title: "Events", icon: "📅", description: "Promote Lunch & Learns, webinars, and booking sessions.", link: "/hbt/events", accent: "from-slate-700 to-slate-950" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-2xl md:p-10">
          <img src={dashboardImage} alt="Team meeting" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-blue-950/50" />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-300">Home Buying Team Control Center</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">HBT Dashboard</h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-300">
                Welcome, <strong className="text-white">{user.full_name || "HBT Member"}</strong>. Manage partnerships, employee engagement, appointment requests, resources, events, and team members from one command center.
              </p>
            </div>
            <button onClick={handleLogout} className="rounded-full bg-red-600 px-7 py-3 font-black text-white shadow-lg transition hover:-translate-y-1 hover:bg-red-700">
              Logout
            </button>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {[
            ["Active Partnerships", "Ready"],
            ["Employer Portals", "Configured"],
            ["Appointment Flow", "Live"],
          ].map(([label, value]) => (
            <div key={label} className="metric-card">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">{value}</h2>
            </div>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.title} to={card.link} className="group overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/70 transition hover:-translate-y-2 hover:shadow-2xl">
              <div className={`h-2 bg-gradient-to-r ${card.accent}`} />
              <div className="p-7">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-3xl transition group-hover:scale-110">
                  {card.icon}
                </div>
                <h2 className="text-2xl font-black text-slate-950">{card.title}</h2>
                <p className="mt-4 leading-relaxed text-slate-600">{card.description}</p>
                <p className="mt-6 font-black text-blue-700">Open module →</p>
              </div>
            </Link>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-2xl shadow-blue-500/30">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-100">Operational workflow</p>
            <h2 className="mt-3 text-3xl font-black">Next best action</h2>
            <p className="mt-4 text-blue-50">Review appointment requests, then check quiz activity and employee engagement to prioritize warm follow-ups.</p>
            <Link to="/hbt/appointments" className="mt-6 inline-flex rounded-full bg-white px-6 py-3 font-black text-blue-700 transition hover:-translate-y-1">
              Review appointments
            </Link>
          </div>
          <div className="rounded-[2rem] bg-white p-8 shadow-xl">
            <h2 className="text-3xl font-black">What this dashboard proves</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {["Role-based login", "Partnership ownership", "Appointment workflow"].map((item) => (
                <div key={item} className="rounded-3xl bg-slate-50 p-5 font-bold text-slate-700">
                  <span className="mr-2 text-blue-600">✓</span>{item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTDashboard;
