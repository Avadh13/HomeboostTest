import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

const heroImage =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80";
const familyImage =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80";
const advisorImage =
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80";
const keysImage =
  "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&q=80";

type Card = {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  button_text?: string | null;
  button_link?: string | null;
};

type Section = {
  id: number;
  section_key: string;
  title?: string | null;
  subtitle?: string | null;
  content?: string | null;
  image_url?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  display_order?: number;
  sort_order?: number;
  cards?: Card[];
};

type Page = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  sections?: Section[];
};

type FAQ = {
  id: number;
  question: string;
  answer: string;
  page_slug?: string;
};

const fallbackPage: Page = {
  id: 0,
  title: "Home",
  slug: "home",
  sections: [],
};

function Home() {
  const [page, setPage] = useState<Page | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiWarning, setApiWarning] = useState("");

  useEffect(() => {
    const loadHomePage = async (): Promise<Page> => {
      try {
        const res = await fetch(`${API_BASE_URL}/pages/home`);
        if (!res.ok) {
          throw new Error(`Home page API returned ${res.status}`);
        }
        return res.json();
      } catch (err) {
        console.error("Home page API fallback:", err);
        setApiWarning("Live CMS content could not be loaded, so the default landing page is being shown.");
        return fallbackPage;
      }
    };

    const loadFaqs = async (): Promise<FAQ[]> => {
      try {
        const res = await fetch(`${API_BASE_URL}/faqs`);
        if (!res.ok) return [];
        return res.json();
      } catch (err) {
        console.error("FAQ API fallback:", err);
        return [];
      }
    };

    Promise.all([loadHomePage(), loadFaqs()])
      .then(([pageData, faqData]) => {
        setPage(pageData);
        setFaqs(
          Array.isArray(faqData)
            ? faqData.filter((faq: FAQ) => !faq.page_slug || faq.page_slug === "home")
            : []
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const sections = page?.sections || [];
  const hero = sections.find((section) => section.section_key === "hero");
  const resourceSection = sections.find((section) => section.section_key === "resources");

  const featureCards = useMemo(
    () => [
      {
        title: "Branded employer pages",
        text: "Each employer gets a beautiful custom landing page using their slug, logo, colours, and program messaging.",
        icon: "🏢",
      },
      {
        title: "Employee-ready portal",
        text: "Employees can see resources, team members, events, quizzes, and booking links in one place.",
        icon: "👥",
      },
      {
        title: "HBT management tools",
        text: "Home Buying Teams manage partnerships, resources, team members, events, and lead activity.",
        icon: "📈",
      },
    ],
    []
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <section className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="font-semibold text-slate-600">Loading HomeBoost experience...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <Navbar />

      {apiWarning && (
        <div className="mx-auto mt-6 max-w-7xl px-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800">
            {apiWarning}
          </div>
        </div>
      )}

      <section className="relative px-6 py-20 lg:py-28">
        <div className="floating-orb -left-28 top-10 h-72 w-72 bg-blue-400" />
        <div className="floating-orb right-0 top-36 h-96 w-96 bg-purple-400" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              One platform for employer home-buying benefits
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
              {hero?.title || "Make home buying benefits feel premium."}
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-600">
              {hero?.subtitle ||
                "A branded portal where employees get education, trusted professionals, readiness tools, events, and next steps."}
            </p>

            <p className="mt-4 max-w-2xl text-slate-500">
              {hero?.content ||
                "HomeBoost connects each employer partnership to the right Home Buying Team, while employees enjoy a simple, modern benefit experience."}
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link to={hero?.button_link || "/login"} className="btn-primary">
                {hero?.button_text || "Login to Dashboard"}
              </Link>
              <Link to="/partners" className="btn-secondary">
                View Employer Portals
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["3", "User roles"],
                ["1", "Login door"],
                ["100%", "Partnership flow"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-3xl border border-white bg-white/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-2xl font-black text-blue-700">{value}</p>
                  <p className="text-sm font-semibold text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-yellow-300/40 blur-2xl" />
            <img
              src={heroImage}
              alt="Modern home"
              className="h-[520px] w-full rounded-[2.5rem] object-cover shadow-2xl shadow-blue-900/20"
            />
            <div className="glass-card absolute -bottom-8 left-6 right-6 rounded-[2rem] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Employer portal</p>
                  <h3 className="mt-1 text-2xl font-black">Employer Partnership</h3>
                  <p className="mt-1 text-sm text-slate-600">Branded entry page connected to the assigned Home Buying Team.</p>
                </div>
                <Link to="/partners" className="rounded-full bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-blue-700">
                  Open
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((card) => (
              <div key={card.title} className="metric-card group">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-3xl transition group-hover:scale-110">
                  {card.icon}
                </div>
                <h3 className="text-2xl font-black">{card.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <img src={familyImage} alt="Family near home" className="h-80 rounded-[2rem] object-cover shadow-xl" />
            <div className="space-y-4 pt-10">
              <img src={advisorImage} alt="Advisor meeting" className="h-48 w-full rounded-[2rem] object-cover shadow-xl" />
              <img src={keysImage} alt="Home keys" className="h-48 w-full rounded-[2rem] object-cover shadow-xl" />
            </div>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">How it works</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Partnership powers the whole website.</h2>
            <div className="mt-8 space-y-5">
              {[
                ["1", "Super Admin creates a Home Buying Team."],
                ["2", "HBT Admin creates an employer partnership with a unique employer portal slug."],
                ["3", "Employees sign up from that branded page and receive the correct portal experience."],
              ].map(([step, text]) => (
                <div key={step} className="flex gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white">{step}</span>
                  <p className="font-semibold leading-relaxed text-slate-700">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">Employee content</p>
              <h2 className="mt-2 text-4xl font-black">Resources employees actually want.</h2>
            </div>
            <Link to="/resources" className="font-bold text-blue-700 hover:text-blue-900">
              Browse resources →
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {(resourceSection?.cards?.length ? resourceSection.cards : [
              { id: 1, title: "Mortgage readiness", description: "Simple education before employees talk to a lender." },
              { id: 2, title: "Credit confidence", description: "Guidance that helps employees understand their buying position." },
              { id: 3, title: "Trusted next steps", description: "Connect employees with the right advisor and support path." },
            ]).map((card) => (
              <div key={card.id} className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <h3 className="text-2xl font-black">{card.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">FAQ</p>
            <h2 className="mt-2 text-4xl font-black">Common questions</h2>
            <div className="mt-8 space-y-4">
              {faqs.slice(0, 4).map((faq) => (
                <div key={faq.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                  <h3 className="font-black text-slate-900">{faq.question}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default Home;
