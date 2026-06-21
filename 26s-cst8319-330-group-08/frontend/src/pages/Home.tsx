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

function Home() {
  const [page, setPage] = useState<Page | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/pages/home`).then((res) => {
        if (!res.ok) throw new Error("Failed to load home page");
        return res.json();
      }),
      fetch(`${API_BASE_URL}/faqs`).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([pageData, faqData]) => {
        setPage(pageData);
        setFaqs(
          Array.isArray(faqData)
            ? faqData.filter((faq: FAQ) => !faq.page_slug || faq.page_slug === "home")
            : []
        );
      })
      .catch((err) => {
        console.error("Home load error:", err);
        setError("Could not load the home page. Check backend, database, and CORS settings.");
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

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border bg-white p-8 shadow-xl">
            <h1 className="text-2xl font-bold text-red-600">Home page error</h1>
            <p className="mt-3 text-slate-700">{error}</p>
            <code className="mt-4 block rounded-xl bg-slate-100 p-3 text-sm">{API_BASE_URL}/pages/home</code>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <Navbar />

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
              <p className="mt-3 max-w-2xl text-slate-600">The portal includes guides, checklists, planning tools, quizzes, and events so employees receive practical support.</p>
            </div>
            <Link to="/resources" className="btn-secondary">View all resources</Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {((resourceSection?.cards || []).length > 0
              ? resourceSection?.cards || []
              : [
                  { id: 1, title: "First-Time Buyer Guide", description: "A plain-English roadmap from pre-approval to closing day.", image_url: familyImage, button_text: "Read guide", button_link: "/resources" },
                  { id: 2, title: "Mortgage Readiness", description: "Know your budget, documents, credit, and savings before shopping.", image_url: advisorImage, button_text: "Open checklist", button_link: "/resources" },
                  { id: 3, title: "Booking Support", description: "Connect with mortgage, realtor, and planning experts from your HBT.", image_url: keysImage, button_text: "View portal", button_link: "/partners" },
                ]).map((card) => (
              <Link key={card.id} to={card.button_link || "/resources"} className="group overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/70 transition hover:-translate-y-2 hover:shadow-2xl">
                <img src={card.image_url || familyImage} alt={card.title} className="h-56 w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="p-6">
                  <h3 className="text-2xl font-black">{card.title}</h3>
                  <p className="mt-3 text-slate-600">{card.description}</p>
                  <p className="mt-5 font-bold text-blue-700">{card.button_text || "Explore"} →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-slate-950 px-6 py-20 text-white">
        <div className="floating-orb bottom-0 left-0 h-72 w-72 bg-blue-500" />
        <div className="floating-orb right-0 top-0 h-72 w-72 bg-purple-500" />
        <div className="relative mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          {[
            ["Admin", "Onboard HBTs, manage platform content, quizzes, pages, pricing, and messages."],
            ["HBT Admin", "Create employer partnerships, manage team members, events, resources, and employees."],
            ["Employee", "Access branded portal, resources, quiz, events, and appointment links."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[2rem] border border-white/10 bg-white/10 p-7 backdrop-blur transition hover:bg-white/15">
              <h3 className="text-2xl font-black">{title}</h3>
              <p className="mt-4 leading-relaxed text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="bg-slate-50 px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-sm font-black uppercase tracking-[0.25em] text-blue-600">Questions</p>
            <h2 className="mt-2 text-center text-4xl font-black">Frequently Asked Questions</h2>
            <div className="mt-10 space-y-4">
              {faqs.map((faq) => (
                <details key={faq.id} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm open:shadow-xl">
                  <summary className="cursor-pointer list-none font-black text-lg text-slate-900">
                    {faq.question}
                    <span className="float-right text-blue-600 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-4 leading-relaxed text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-10 text-center text-white shadow-2xl shadow-blue-500/30 md:p-16">
          <h2 className="text-4xl font-black md:text-5xl">Ready to launch the full flow?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-blue-50">Open a branded employer page, create an employee account, then log in and access the connected employee portal.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/partners" className="rounded-full bg-white px-7 py-3 font-black text-blue-700 transition hover:-translate-y-1">Open employer portals</Link>
            <Link to="/login" className="rounded-full border border-white/40 px-7 py-3 font-black text-white transition hover:bg-white/10">Login</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
