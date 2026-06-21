import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

const brandImage =
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1400&q=80";
const meetingImage =
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80";

type Partnership = {
  partnership_id: number;
  partnership_slug: string;
  employer_name: string;
  logo_url: string | null;
  brand_primary_color: string;
  brand_secondary_color: string;
  team_name: string;
};

function PartnershipLanding() {
  const { slug } = useParams();
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/partnerships/public/${slug}`)
      .then((res) => res.json())
      .then((data) => setPartnership(data.status === "error" ? null : data))
      .catch(() => setPartnership(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="font-semibold text-slate-600">Loading employer program...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!partnership) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center px-6">
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
            <h1 className="text-3xl font-black">Employer page not found</h1>
            <p className="mt-3 text-slate-600">This partnership slug is not active yet.</p>
            <Link to="/" className="btn-primary mt-6">Go home</Link>
          </div>
        </div>
      </main>
    );
  }

  const primary = partnership.brand_primary_color || "#2563eb";
  const secondary = partnership.brand_secondary_color || "#eff6ff";

  return (
    <main className="min-h-screen text-slate-950" style={{ backgroundColor: secondary }}>
      <Navbar />
      <section className="relative overflow-hidden px-6 py-16 md:py-24">
        <div className="floating-orb -left-24 top-16 h-80 w-80" style={{ backgroundColor: primary }} />
        <div className="floating-orb right-0 top-48 h-96 w-96 bg-white" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-sm font-black shadow-sm backdrop-blur">
              <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary }} />
              Employer Benefit Program
            </div>

            {partnership.logo_url && (
              <img src={partnership.logo_url} alt={partnership.employer_name} className="mb-6 h-16 rounded-2xl object-contain" />
            )}

            <h1 className="text-5xl font-black leading-tight tracking-tight md:text-7xl">
              {partnership.employer_name} Home Buying Benefit
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-700">
              Employees get step-by-step home-buying education, trusted expert support, events, quizzes, and booking links from <strong>{partnership.team_name}</strong>.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to={`/signup?partnership=${partnership.partnership_slug}`}
                className="rounded-full px-7 py-3 font-black text-white shadow-lg transition hover:-translate-y-1"
                style={{ backgroundColor: primary }}
              >
                Create Employee Account
              </Link>
              <Link to="/login" className="btn-secondary">
                Already registered? Login
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["✓", "Personalized portal"],
                ["✓", "Expert guidance"],
                ["✓", "Free resources"],
              ].map(([icon, text]) => (
                <div key={text} className="rounded-3xl bg-white/80 p-4 font-bold shadow-sm backdrop-blur">
                  <span className="mr-2" style={{ color: primary }}>{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <img src={brandImage} alt="Employer benefit home" className="h-[520px] w-full rounded-[2.5rem] object-cover shadow-2xl" />
            <div className="glass-card absolute -bottom-8 left-6 right-6 rounded-[2rem] p-6">
              <p className="text-sm font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Connected partnership</p>
              <h3 className="mt-1 text-2xl font-black">{partnership.team_name}</h3>
              <p className="mt-2 text-slate-600">This page is powered by partnership slug: <strong>/{partnership.partnership_slug}</strong></p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            ["1", "Learn", "Read simple guides about mortgage readiness, budgets, down payments, and closing steps."],
            ["2", "Plan", "Take the readiness quiz and understand your next best action before shopping."],
            ["3", "Connect", "Book time with the right expert from your assigned Home Buying Team."],
          ].map(([step, title, text]) => (
            <div key={title} className="rounded-[2rem] bg-white/85 p-7 shadow-xl transition hover:-translate-y-2">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full font-black text-white" style={{ backgroundColor: primary }}>{step}</div>
              <h3 className="text-2xl font-black">{title}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white/70 px-6 py-20 backdrop-blur">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <img src={meetingImage} alt="Advisor meeting" className="h-[420px] w-full rounded-[2.5rem] object-cover shadow-2xl" />
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em]" style={{ color: primary }}>Employee journey</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">From confused to confident.</h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              This program gives employees a safe place to start. They do not need to already understand mortgages, real estate, or pre-approval. The portal guides them step by step.
            </p>
            <Link
              to={`/signup?partnership=${partnership.partnership_slug}`}
              className="mt-8 inline-flex rounded-full px-7 py-3 font-black text-white shadow-lg transition hover:-translate-y-1"
              style={{ backgroundColor: primary }}
            >
              Join Program
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PartnershipLanding;
