import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
const defaultAvatar =
  "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=800&q=80";
const portalImage =
  "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80";

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
};

function EmployeePortal() {
  const navigate = useNavigate();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${API_BASE_URL}/employee-portal`, {
      headers: { Authorization: `Bearer ${token}` },
    })
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="font-semibold text-slate-600">Loading your portal...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-red-600">Could not load employee portal</h1>
          <p className="mt-3 text-slate-600">Your employee account may not be linked to a partnership yet.</p>
          <button onClick={logout} className="btn-primary mt-6">Back to Login</button>
        </div>
      </main>
    );
  }

  const { employee } = data;
  const primary = employee.brand_primary_color || "#2563eb";
  const secondary = employee.brand_secondary_color || "#f8fafc";

  return (
    <main className="min-h-screen overflow-hidden text-slate-950" style={{ backgroundColor: secondary }}>
      <section className="relative px-6 py-8 md:py-10">
        <div className="floating-orb -left-24 top-14 h-80 w-80" style={{ backgroundColor: primary }} />
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col justify-between gap-4 rounded-[2rem] bg-white/85 p-5 shadow-xl backdrop-blur md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl font-black text-white" style={{ backgroundColor: primary }}>
                {employee.employer_name?.charAt(0) || "E"}
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em]" style={{ color: primary }}>{employee.employer_name}</p>
                <h1 className="text-2xl font-black">Welcome, {employee.full_name}</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/employee/appointments" className="rounded-full bg-slate-950 px-6 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700">
                My Appointments
              </Link>
              <button onClick={logout} className="rounded-full bg-red-600 px-6 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-red-700">
                Logout
              </button>
            </div>
          </header>

          <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2.5rem] bg-white p-8 shadow-2xl md:p-10">
              <p className="text-sm font-black uppercase tracking-[0.25em]" style={{ color: primary }}>Your benefit hub</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Your home-buying roadmap starts here.</h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                Your program is supported by <strong>{employee.team_name}</strong>. Start with resources, take the readiness quiz, then request time with a trusted expert when you are ready.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/resources" className="btn-primary" style={{ background: primary }}>
                  Browse Resources
                </Link>
                <Link to="/quiz" className="btn-secondary">
                  Take Readiness Quiz
                </Link>
                <Link to="/employee/appointments" className="rounded-full bg-slate-950 px-7 py-3 font-black text-white shadow-lg transition hover:-translate-y-1 hover:bg-blue-700">
                  Request Appointment
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
              <img src={portalImage} alt="Home" className="h-72 w-full object-cover" />
              <div className="p-6">
                <p className="text-sm font-bold text-slate-500">Current support team</p>
                <h3 className="mt-1 text-2xl font-black">{employee.team_name}</h3>
                <p className="mt-2 text-slate-600">{employee.team_description || "Mortgage, real estate, and home-buying support connected to your employer benefit."}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            {[
              ["Resources", data.resources.length, "Guides, checklists, and planning tools"],
              ["Quizzes", data.quizzes.length, "Readiness checks and next steps"],
              ["Experts", data.team_members.length, "Advisors available for booking"],
            ].map(([label, count, text]) => (
              <div key={label} className="metric-card">
                <p className="text-4xl font-black" style={{ color: primary }}>{count}</p>
                <h3 className="mt-2 text-xl font-black">{label}</h3>
                <p className="mt-2 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] bg-white p-7 shadow-xl">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Learn</p>
                  <h2 className="text-3xl font-black">Recommended Resources</h2>
                </div>
                <Link to="/resources" className="font-bold text-blue-700">All →</Link>
              </div>
              <div className="space-y-4">
                {data.resources.map((resource) => (
                  <Link key={resource.id} to={`/resources/${resource.id}`} className="block rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-blue-50">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{resource.category || "Resource"}</p>
                    <h3 className="mt-1 text-lg font-black">{resource.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{resource.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-7 shadow-xl">
              <div className="mb-6">
                <p className="text-sm font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Plan</p>
                <h2 className="text-3xl font-black">Readiness Quizzes</h2>
              </div>
              <div className="space-y-4">
                {data.quizzes.map((quiz) => (
                  <Link key={quiz.id} to={`/quiz/${quiz.id}`} className="block rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-indigo-50">
                    <h3 className="text-lg font-black">{quiz.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{quiz.description}</p>
                    <p className="mt-4 font-bold text-indigo-700">Start quiz →</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-7 shadow-xl">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Connect</p>
                <h2 className="text-3xl font-black">Your Home Buying Team</h2>
              </div>
              <p className="max-w-2xl text-slate-600">Request an appointment with a specialist when you are ready to talk through your next step.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {data.team_members.map((member) => (
                <div key={member.id} className="overflow-hidden rounded-[2rem] border border-slate-100 bg-slate-50 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <img src={member.photo_url || defaultAvatar} alt={member.full_name} className="h-44 w-full object-cover" />
                  <div className="p-5">
                    <h3 className="text-xl font-black">{member.full_name}</h3>
                    <p className="font-semibold" style={{ color: primary }}>{member.title}</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{member.bio}</p>
                    <Link to="/employee/appointments" className="mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-black text-white" style={{ backgroundColor: primary }}>
                      Request appointment
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
      <ChatWidget />
    </main>
  );
}

export default EmployeePortal;
