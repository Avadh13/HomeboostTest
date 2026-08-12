import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
import EmployeeDashboardAnalytics from "../components/EmployeeDashboardAnalytics";
import type { EmployeeDashboardAnalyticsData } from "../components/EmployeeDashboardAnalytics";
import EmployeeLeadProgress from "../components/EmployeeLeadProgress";

type PortalData = {
  employee: {
    full_name: string;
    employer_name: string;
    employer_logo_url: string | null;
    brand_primary_color: string;
    brand_secondary_color: string;
    portal_title?: string | null;
    welcome_message?: string | null;
    prompt_text?: string | null;
    footer_text?: string | null;
    team_name: string;
    team_description: string | null;
  };
  team_members: Array<{
    id: number;
    full_name: string;
    title: string;
    email: string;
    phone: string;
    booking_link: string;
    bio: string;
    photo_url?: string | null;
  }>;
  resources: Array<{ id: number; title: string; description: string; category: string }>;
  quizzes: Array<{ id: number; title: string; description: string }>;
  analytics?: EmployeeDashboardAnalyticsData;
};

const memberInitials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "HB";

function EmployeePortal() {
  const navigate = useNavigate();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${API_BASE_URL}/employee-portal`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((payload) => setData(payload.status === "success" ? payload : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [token]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const journeySteps = useMemo(
    () => [
      { title: "Journey", text: "Follow the journey assigned to your employee account.", action: "View journey", path: "/employee/journey" },
      { title: "Resources", text: "Open the resources currently available through your employer partnership.", action: "Browse resources", path: "/resources" },
      { title: "Readiness", text: "Complete an available readiness quiz when one is assigned to your partnership.", action: "View quizzes", path: "/quiz" },
      { title: "Advisor", text: "Use secure communication to ask your assigned Home Buying Team for support.", action: "Message advisor", path: "/employee/messages" },
    ],
    [],
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="premium-card text-center">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="font-semibold text-slate-600">Loading your portal...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="premium-card max-w-lg text-center">
          <h1 className="text-2xl font-black text-red-600">Could not load employee portal</h1>
          <p className="mt-3 text-slate-600">Your employee account may not be linked to an active employer partnership yet.</p>
          <button onClick={logout} className="btn-primary mt-6">Back to Login</button>
        </div>
      </main>
    );
  }

  const { employee } = data;
  const primary = employee.brand_primary_color || "#2563eb";
  const secondary = employee.brand_secondary_color || "#f8fafc";
  const portalTitle = employee.portal_title || `${employee.employer_name} Home Buying Portal`;
  const welcomeMessage = employee.welcome_message || `Welcome, ${employee.full_name}. Your program is supported by ${employee.team_name}.`;
  const promptText = employee.prompt_text || "Open your assigned journey, resources, quizzes, or secure messages to continue.";
  const journeyProgressPercent = data.analytics?.journey?.percent;
  const hasJourneyProgress = typeof journeyProgressPercent === "number" && Number.isFinite(journeyProgressPercent);

  return (
    <main className="min-h-screen overflow-hidden text-slate-950" style={{ backgroundColor: secondary }}>
      <section className="relative px-4 py-6 md:px-6 md:py-8">
        <div className="floating-orb -left-24 top-14 h-80 w-80" style={{ backgroundColor: primary }} />
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] bg-white/90 p-4 shadow-xl backdrop-blur md:p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl font-black text-white" style={{ backgroundColor: primary }}>
                {employee.employer_logo_url ? <img src={employee.employer_logo_url} alt={employee.employer_name} className="h-full w-full object-cover" /> : employee.employer_name?.charAt(0) || "E"}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: primary }}>{employee.employer_name}</p>
                <h1 className="text-xl font-black md:text-2xl">{portalTitle}</h1>
              </div>
            </div>
            <button onClick={logout} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-red-50 hover:text-red-700">Logout</button>
          </header>

          <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] bg-white p-6 shadow-2xl md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Your benefit hub</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Welcome, {employee.full_name}</h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">{welcomeMessage}</p>
              <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm font-bold text-slate-700 ring-1 ring-slate-100">{promptText}</div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/employee/journey" className="btn-primary" style={{ background: primary }}>View Journey</Link>
                <Link to="/resources" className="btn-secondary">Browse Resources</Link>
                <Link to="/quiz" className="btn-secondary">View Quizzes</Link>
                <Link to="/employee/messages" className="btn-dark">Message Advisor</Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Assigned support</p>
              <h3 className="mt-2 text-3xl font-black">{employee.team_name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{employee.team_description || "Your assigned Home Buying Team provides the program support available through this employer partnership."}</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-black" style={{ color: primary }}>{data.resources.length}</p><p className="mt-1 text-xs font-bold text-slate-500">Resources</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-black" style={{ color: primary }}>{data.quizzes.length}</p><p className="mt-1 text-xs font-bold text-slate-500">Quizzes</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-black" style={{ color: primary }}>{data.team_members.length}</p><p className="mt-1 text-xs font-bold text-slate-500">Advisors</p></div>
              </div>
            </div>
          </section>

          {data.analytics && <EmployeeDashboardAnalytics analytics={data.analytics} primary={primary} />}
          <EmployeeLeadProgress primary={primary} />

          <section className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
            <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Your journey</p>
                <h2 className="mt-2 text-2xl font-black">Home-buying progress</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Progress is calculated only from recorded journey activity.</p>
                {hasJourneyProgress ? (
                  <div className="mt-4">
                    <div className="mb-2 flex justify-between text-xs font-black uppercase tracking-wide text-slate-500"><span>Progress</span><span>{Math.round(journeyProgressPercent)}%</span></div>
                    <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, journeyProgressPercent))}%`, backgroundColor: primary }} /></div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">No recorded journey progress is available yet. Open your journey to view assigned steps.</div>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {journeySteps.map((step, index) => (
                  <Link key={step.title} to={step.path} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: primary }}>{index + 1}</span>
                    <h3 className="mt-3 font-black text-slate-950">{step.title}</h3>
                    <p className="mt-1 min-h-[48px] text-xs leading-relaxed text-slate-600">{step.text}</p>
                    <p className="mt-3 text-xs font-black" style={{ color: primary }}>{step.action} →</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {!data.analytics && (
            <section className="grid gap-4 md:grid-cols-3">
              {[["Resources", data.resources.length, "Assigned guides and planning tools"], ["Quizzes", data.quizzes.length, "Available readiness checks"], ["Advisors", data.team_members.length, "Assigned Home Buying Team members"]].map(([label, count, text]) => (
                <div key={label} className="metric-card"><p className="text-3xl font-black" style={{ color: primary }}>{count}</p><h3 className="mt-2 text-lg font-black">{label}</h3><p className="mt-2 text-sm text-slate-600">{text}</p></div>
              ))}
            </section>
          )}

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[2rem] bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Learn</p><h2 className="text-2xl font-black md:text-3xl">Assigned Resources</h2></div><Link to="/resources" className="font-bold text-blue-700">All →</Link></div>
              <div className="space-y-3">
                {data.resources.slice(0, 5).map((resource) => (
                  <Link key={resource.id} to={`/resources/${resource.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-blue-50"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{resource.category || "Resource"}</p><h3 className="mt-1 text-lg font-black">{resource.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{resource.description}</p></Link>
                ))}
                {data.resources.length === 0 && <p className="text-sm font-bold text-slate-500">No resources are assigned to this partnership yet.</p>}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-xl">
              <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Plan</p><h2 className="text-2xl font-black md:text-3xl">Readiness Quizzes</h2></div>
              <div className="space-y-3">
                {data.quizzes.slice(0, 5).map((quiz) => (
                  <Link key={quiz.id} to={`/quiz/${quiz.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-indigo-50"><h3 className="text-lg font-black">{quiz.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{quiz.description}</p><p className="mt-4 font-bold text-indigo-700">Open quiz →</p></Link>
                ))}
                {data.quizzes.length === 0 && <p className="text-sm font-bold text-slate-500">No quizzes are assigned to this partnership yet.</p>}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="grid gap-0 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="relative overflow-hidden p-8 text-white" style={{ background: `linear-gradient(135deg, ${primary}, #111827)` }}>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-white/75">Connect</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Your Home Buying Team</h2>
                <p className="mt-4 text-base leading-relaxed text-white/80">Message the advisors currently assigned to your employer partnership.</p>
                <div className="mt-7 rounded-2xl bg-white/12 p-4 backdrop-blur"><p className="text-3xl font-black">{data.team_members.length}</p><p className="text-sm font-bold text-white/75">Assigned advisors</p></div>
              </div>
              <div className="bg-slate-50 p-5 md:p-7">
                <div className="grid gap-4">
                  {data.team_members.map((member) => (
                    <article key={member.id} className="group rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:p-5">
                      <div className="grid gap-5 md:grid-cols-[120px_1fr_auto] md:items-center">
                        <div className="relative mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.5rem] bg-slate-100 md:mx-0">
                          {member.photo_url ? <img src={member.photo_url} alt={member.full_name} className="h-full w-full object-cover" /> : <span className="text-2xl font-black text-white" style={{ backgroundColor: primary, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{memberInitials(member.full_name)}</span>}
                        </div>
                        <div className="text-center md:text-left">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Home Buying advisor</p>
                          <h3 className="mt-1 text-2xl font-black text-slate-950">{member.full_name}</h3>
                          <p className="mt-1 text-base font-bold" style={{ color: primary }}>{member.title}</p>
                          {member.bio && <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{member.bio}</p>}
                        </div>
                        <div className="flex flex-col gap-2 md:min-w-[170px]"><Link to="/employee/messages" className="rounded-full bg-indigo-600 px-4 py-2.5 text-center text-sm font-black text-white shadow-md transition hover:bg-indigo-700">Message advisor</Link>{member.email && <a href={`mailto:${member.email}`} className="text-center text-xs font-bold text-slate-500 hover:text-slate-900">{member.email}</a>}</div>
                      </div>
                    </article>
                  ))}
                  {data.team_members.length === 0 && <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">No advisors are assigned to this partnership yet.</div>}
                </div>
              </div>
            </div>
          </section>

          {employee.footer_text && <footer className="rounded-[2rem] bg-white/80 p-5 text-center text-sm font-bold text-slate-600 shadow-lg">{employee.footer_text}</footer>}
        </div>
      </section>
      <ChatWidget />
    </main>
  );
}

export default EmployeePortal;
