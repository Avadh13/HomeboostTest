import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
import EmployeeLeadProgress from "../components/EmployeeLeadProgress";

const defaultAvatar = "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=800&q=80";
const portalImage = "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80";

type PortalData = {
  employee: {
    full_name: string;
    employer_name: string;
    employer_logo_url: string | null;
    brand_primary_color: string;
    brand_secondary_color: string;
    team_name: string;
    team_description: string | null;
  };
  team_members: Array<{ id: number; full_name: string; title: string; email: string; phone: string; booking_link: string; bio: string; photo_url?: string | null }>;
  resources: Array<{ id: number; title: string; description: string; category: string }>;
  quizzes: Array<{ id: number; title: string; description: string }>;
};

function EmployeePortal() {
  const navigate = useNavigate();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${API_BASE_URL}/employee-portal`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((payload) => setData(payload.status === "success" ? payload : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));

    fetch(`${API_BASE_URL}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((payload) => setUnreadCount(Number(payload.unread_count || 0)))
      .catch(() => setUnreadCount(0));
  }, [token]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const journeySteps = useMemo(() => [
    { title: "Learn", text: "Review employer benefit resources and home-buying education.", action: "Browse resources", path: "/resources", isReady: Boolean(data?.resources?.length) },
    { title: "Check readiness", text: "Complete a short quiz so your team can guide the right next step.", action: "Take quiz", path: "/quiz", isReady: Boolean(data?.quizzes?.length) },
    { title: "Connect", text: "Message your assigned Home Buying Team for questions and support.", action: "Message team", path: "/employee/messages", isReady: true },
    { title: "Book", text: "Request an appointment when you are ready for a focused conversation.", action: "Book appointment", path: "/employee/appointments", isReady: Boolean(data?.team_members?.length) },
  ], [data]);

  const progressPercent = Math.round((journeySteps.filter((step) => step.isReady).length / journeySteps.length) * 100);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50"><div className="premium-card text-center"><div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /><p className="font-semibold text-slate-600">Loading your portal...</p></div></main>;
  }

  if (!data) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6"><div className="premium-card max-w-lg text-center"><h1 className="text-2xl font-black text-red-600">Could not load employee portal</h1><p className="mt-3 text-slate-600">Your employee account may not be linked to a partnership yet.</p><button onClick={logout} className="btn-primary mt-6">Back to Login</button></div></main>;
  }

  const { employee } = data;
  const primary = employee.brand_primary_color || "#2563eb";
  const secondary = employee.brand_secondary_color || "#f8fafc";

  return (
    <main className="min-h-screen overflow-hidden text-slate-950" style={{ backgroundColor: secondary }}>
      <section className="relative px-4 py-6 md:px-6 md:py-8">
        <div className="floating-orb -left-24 top-14 h-80 w-80" style={{ backgroundColor: primary }} />
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="flex flex-col justify-between gap-4 rounded-[1.75rem] bg-white/90 p-4 shadow-xl backdrop-blur md:flex-row md:items-center md:p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl font-black text-white" style={{ backgroundColor: primary }}>{employee.employer_logo_url ? <img src={employee.employer_logo_url} alt={employee.employer_name} className="h-full w-full object-cover" /> : employee.employer_name?.charAt(0) || "E"}</div>
              <div><p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: primary }}>{employee.employer_name}</p><h1 className="text-xl font-black md:text-2xl">Welcome, {employee.full_name}</h1></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/notifications" className="relative rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700">Notifications{unreadCount > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">{unreadCount}</span>}</Link>
              <Link to="/employee/messages" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-indigo-700">Messages</Link>
              <Link to="/employee/appointments" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700">Appointments</Link>
              <button onClick={logout} className="rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-700">Logout</button>
            </div>
          </header>

          <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] bg-white p-6 shadow-2xl md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Your benefit hub</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Your home-buying roadmap starts here.</h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">Your program is supported by <strong>{employee.team_name}</strong>. Start with resources, take the readiness quiz, then request time with a trusted expert when you are ready.</p>
              <div className="mt-7 flex flex-wrap gap-3"><Link to="/resources" className="btn-primary" style={{ background: primary }}>Browse Resources</Link><Link to="/quiz" className="btn-secondary">Take Readiness Quiz</Link><Link to="/employee/appointments" className="btn-dark">Request Appointment</Link><Link to="/employee/messages" className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-700">Message Your Team</Link></div>
            </div>
            <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl"><img src={portalImage} alt="Home" className="h-60 w-full object-cover" /><div className="p-5"><p className="text-sm font-bold text-slate-500">Current support team</p><h3 className="mt-1 text-2xl font-black">{employee.team_name}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{employee.team_description || "Mortgage, real estate, and home-buying support connected to your employer benefit."}</p></div></div>
          </section>

          <EmployeeLeadProgress primary={primary} />

          <section className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
            <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Your journey</p>
                <h2 className="mt-2 text-2xl font-black">Home-buying progress</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Follow these four steps to move from learning to advisor support.</p>
                <div className="mt-4"><div className="mb-2 flex justify-between text-xs font-black uppercase tracking-wide text-slate-500"><span>Progress</span><span>{progressPercent}%</span></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full transition-all" style={{ width: `${progressPercent}%`, backgroundColor: primary }} /></div></div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {journeySteps.map((step, index) => <Link key={step.title} to={step.path} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"><div className="flex items-center justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: step.isReady ? primary : "#94a3b8" }}>{index + 1}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${step.isReady ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{step.isReady ? "Ready" : "Pending"}</span></div><h3 className="mt-3 font-black text-slate-950">{step.title}</h3><p className="mt-1 min-h-[48px] text-xs leading-relaxed text-slate-600">{step.text}</p><p className="mt-3 text-xs font-black" style={{ color: primary }}>{step.action} →</p></Link>)}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            {[["Resources", data.resources.length, "Guides, checklists, and planning tools"], ["Quizzes", data.quizzes.length, "Readiness checks and next steps"], ["Experts", data.team_members.length, "Advisors available for booking"], ["Messages", "Open", "Use Communication Center for team conversations"]].map(([label, count, text]) => <div key={label} className="metric-card"><p className="text-3xl font-black" style={{ color: primary }}>{count}</p><h3 className="mt-2 text-lg font-black">{label}</h3><p className="mt-2 text-sm text-slate-600">{text}</p></div>)}
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[2rem] bg-white p-6 shadow-xl"><div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Learn</p><h2 className="text-2xl font-black md:text-3xl">Recommended Resources</h2></div><Link to="/resources" className="font-bold text-blue-700">All →</Link></div><div className="space-y-3">{data.resources.slice(0, 5).map((resource) => <Link key={resource.id} to={`/resources/${resource.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-blue-50"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{resource.category || "Resource"}</p><h3 className="mt-1 text-lg font-black">{resource.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{resource.description}</p></Link>)}{data.resources.length === 0 && <p className="text-sm font-bold text-slate-500">Resources will appear here when assigned.</p>}</div></div>
            <div className="rounded-[2rem] bg-white p-6 shadow-xl"><div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Plan</p><h2 className="text-2xl font-black md:text-3xl">Readiness Quizzes</h2></div><div className="space-y-3">{data.quizzes.slice(0, 5).map((quiz) => <Link key={quiz.id} to={`/quiz/${quiz.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-indigo-50"><h3 className="text-lg font-black">{quiz.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{quiz.description}</p><p className="mt-4 font-bold text-indigo-700">Start quiz →</p></Link>)}{data.quizzes.length === 0 && <p className="text-sm font-bold text-slate-500">Quizzes will appear here when assigned.</p>}</div></div>
          </section>

          <section className="overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="grid gap-0 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="relative overflow-hidden p-8 text-white" style={{ background: `linear-gradient(135deg, ${primary}, #111827)` }}><p className="text-sm font-black uppercase tracking-[0.25em] text-white/75">Connect</p><h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Your Home Buying Team</h2><p className="mt-4 text-base leading-relaxed text-white/80">Choose an advisor for a focused appointment or start a message in Communication Center.</p><div className="mt-7 rounded-2xl bg-white/12 p-4 backdrop-blur"><p className="text-3xl font-black">{data.team_members.length}</p><p className="text-sm font-bold text-white/75">Available experts</p></div></div>
              <div className="bg-slate-50 p-5 md:p-7"><div className="grid gap-4">{data.team_members.map((member) => <article key={member.id} className="group rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:p-5"><div className="grid gap-5 md:grid-cols-[120px_1fr_auto] md:items-center"><div className="relative mx-auto h-28 w-28 overflow-hidden rounded-[1.5rem] bg-slate-100 md:mx-0"><img src={member.photo_url || defaultAvatar} alt={member.full_name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div><div className="text-center md:text-left"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">HomeBoost advisor</p><h3 className="mt-1 text-2xl font-black text-slate-950">{member.full_name}</h3><p className="mt-1 text-base font-bold" style={{ color: primary }}>{member.title}</p><p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{member.bio || "Ready to support your home-buying questions and next steps."}</p></div><div className="flex flex-col gap-2 md:min-w-[170px]"><Link to="/employee/appointments" className="rounded-full px-4 py-2.5 text-center text-sm font-black text-white shadow-md transition hover:-translate-y-0.5" style={{ backgroundColor: primary }}>Request appointment</Link><Link to="/employee/messages" className="rounded-full bg-indigo-600 px-4 py-2.5 text-center text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-700">Message advisor</Link>{member.email && <a href={`mailto:${member.email}`} className="text-center text-xs font-bold text-slate-500 hover:text-slate-900">{member.email}</a>}</div></div></article>)}{data.team_members.length === 0 && <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">Your Home Buying Team will appear here once advisors are assigned.</div>}</div></div>
            </div>
          </section>
        </div>
      </section>
      <ChatWidget />
    </main>
  );
}

export default EmployeePortal;
