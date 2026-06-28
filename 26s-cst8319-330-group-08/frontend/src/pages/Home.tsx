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
const videoPoster =
  "https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1400&q=80";
const demoVideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const defaultVideoHighlights = ["Portal walkthrough", "Advisor flow", "Resource experience"];

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

const isDirectVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?.*)?$/i.test(url);

const getEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsed.hostname.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }

    if (parsed.hostname.includes("loom.com") && parsed.pathname.includes("/share/")) {
      return url.replace("/share/", "/embed/");
    }
  } catch {
    return url;
  }

  return url;
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
  const videoSection = sections.find((section) => ["video_walkthrough", "video", "walkthrough"].includes(section.section_key));

  const videoUrl = videoSection?.button_link || demoVideoUrl;
  const videoEmbedUrl = getEmbedUrl(videoUrl);
  const videoPosterUrl = videoSection?.image_url || videoPoster;
  const videoHighlights = videoSection?.cards?.length
    ? videoSection.cards.map((card) => card.title).filter(Boolean)
    : defaultVideoHighlights;

  const featureCards = useMemo(
    () => [
      {
        title: "Employer-branded portals",
        text: "Each employer gets a polished landing page connected to the right Home Buying Team and partnership flow.",
        icon: "🏢",
      },
      {
        title: "Employee guidance hub",
        text: "Resources, quizzes, advisor connections, events, and appointment booking live in one simple benefit experience.",
        icon: "🏡",
      },
      {
        title: "HBT operation tools",
        text: "Teams can manage partnerships, resources, events, employees, appointments, and communication from role-based dashboards.",
        icon: "⚡",
      },
    ],
    []
  );

  const journeySteps = useMemo(
    () => [
      ["01", "Create partnership", "Admin or HBT creates an employer profile, slug, and team assignment."],
      ["02", "Invite employees", "Employees enter through the branded portal and land in the correct benefit experience."],
      ["03", "Guide next steps", "Resources, quizzes, events, communication, and appointments move the employee forward."],
    ],
    []
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <section className="flex min-h-[70vh] items-center justify-center px-6">
          <div className="premium-card text-center">
            <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="font-black text-slate-800">Loading HomeBoost experience...</p>
            <p className="mt-2 text-sm text-slate-500">Preparing your premium benefit portal.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="theme-page overflow-hidden text-slate-950">
      <Navbar />

      {apiWarning && import.meta.env.DEV && (
        <div className="mx-auto mt-6 max-w-7xl px-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800">
            {apiWarning}
          </div>
        </div>
      )}

      <section className="relative px-6 py-16 lg:py-24">
        <div className="floating-orb -left-28 top-10 h-72 w-72 bg-blue-400" />
        <div className="floating-orb right-0 top-36 h-96 w-96 bg-violet-400" />
        <div className="floating-orb bottom-0 left-1/2 h-80 w-80 bg-cyan-300" />

        <div className="section-container grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-black text-blue-700 shadow-sm backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400/40" />
              One platform for employer home-buying benefits
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-7xl xl:text-8xl">
              {hero?.title || "Premium home-buying benefits for every employee."}
            </h1>

            <p className="mt-7 max-w-2xl text-xl leading-relaxed text-slate-600 md:text-2xl">
              {hero?.subtitle ||
                "A modern employee benefit portal that turns mortgage education, trusted advisors, and next steps into one guided experience."}
            </p>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
              {hero?.content ||
                "HomeBoost connects employer partnerships to the right Home Buying Team while giving employees resources, quizzes, events, appointments, and communication in one beautiful flow."}
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link to={hero?.button_link || "/login"} className="btn-primary">
                {hero?.button_text || "Open Portal"}
              </Link>
              <Link to="/partners" className="btn-secondary">
                View Employer Portals
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["4", "Role dashboards"],
                ["24/7", "Benefit access"],
                ["1", "Guided journey"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-3xl border border-white bg-white/75 p-5 shadow-sm backdrop-blur-xl">
                  <p className="text-3xl font-black text-blue-700">{value}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-yellow-300/40 blur-2xl" />
            <div className="premium-surface p-3">
              <img
                src={hero?.image_url || heroImage}
                alt="Modern home buying benefit"
                className="h-[560px] w-full rounded-[2.25rem] object-cover"
              />
              <div className="glass-card absolute bottom-8 left-8 right-8 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Employer portal</p>
                    <h3 className="mt-1 text-2xl font-black">Personalized benefit entry</h3>
                    <p className="mt-1 text-sm text-slate-600">A branded route connected to the assigned Home Buying Team.</p>
                  </div>
                  <Link to="/partners" className="btn-dark px-5 py-3">
                    Open
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 lg:py-14">
        <div className="section-container grid gap-5 md:grid-cols-3">
          {featureCards.map((card) => (
            <div key={card.title} className="metric-card group">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-3xl transition group-hover:scale-110">
                {card.icon}
              </div>
              <h3 className="text-2xl font-black tracking-tight">{card.title}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="section-container premium-surface grid gap-10 p-6 lg:grid-cols-[0.92fr_1.08fr] lg:p-10">
          <div className="flex flex-col justify-between rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-8 text-white">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">
                {videoSection?.title || "Video walkthrough"}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                {videoSection?.subtitle || "Show the employee journey in seconds."}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-violet-100">
                {videoSection?.content ||
                  "Use this section for Kelly's final promo video, a Loom walkthrough, or a short demo showing how employees enter their employer portal and book next steps."}
              </p>
            </div>

            <div className="mt-8 grid gap-3">
              {videoHighlights.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 font-bold text-violet-50 backdrop-blur">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-slate-950">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="video-card">
            {isDirectVideoUrl(videoUrl) ? (
              <video className="h-full min-h-[360px] w-full object-cover" controls poster={videoPosterUrl} preload="metadata">
                <source src={videoUrl} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <iframe
                className="h-full min-h-[360px] w-full"
                src={videoEmbedUrl}
                title={videoSection?.subtitle || "HomeBoost video walkthrough"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>
        </div>
      </section>

      <section className="bg-white/80 px-6 py-20 backdrop-blur">
        <div className="section-container grid items-center gap-12 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <img src={familyImage} alt="Family near home" className="h-80 rounded-[2rem] object-cover shadow-xl" />
            <div className="space-y-4 pt-10">
              <img src={advisorImage} alt="Advisor meeting" className="h-48 w-full rounded-[2rem] object-cover shadow-xl" />
              <img src={keysImage} alt="Home keys" className="h-48 w-full rounded-[2rem] object-cover shadow-xl" />
            </div>
          </div>
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">One partnership powers the whole experience.</h2>
            <div className="mt-8 space-y-5">
              {journeySteps.map(([step, title, text]) => (
                <div key={step} className="flex gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-blue-50/50 hover:shadow-lg">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 font-black text-white shadow-lg shadow-blue-500/20">{step}</span>
                  <div>
                    <h3 className="font-black text-slate-950">{title}</h3>
                    <p className="mt-1 font-semibold leading-relaxed text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="section-container">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">Employee content</p>
              <h2 className="mt-2 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">Resources employees actually want to use.</h2>
            </div>
            <Link to="/resources" className="btn-secondary">
              Browse resources →
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {(resourceSection?.cards?.length ? resourceSection.cards : [
              { id: 1, title: "Mortgage readiness", description: "Simple education before employees talk to a lender." },
              { id: 2, title: "Credit confidence", description: "Guidance that helps employees understand their buying position." },
              { id: 3, title: "Trusted next steps", description: "Connect employees with the right advisor and support path." },
            ]).map((card) => (
              <div key={card.id} className="premium-card">
                <div className="mb-5 h-2 w-16 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
                <h3 className="text-2xl font-black">{card.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="section-container rounded-[2.75rem] bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-8 text-white shadow-2xl md:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-200">Ready for demo</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Give every employer a portal that feels custom.</h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-blue-100">
                Built for employer benefits, Home Buying Teams, and employees who need clear guidance from education to appointment booking.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-col">
              <Link to="/partners" className="rounded-full bg-white px-7 py-3 text-center font-black text-slate-950 transition hover:-translate-y-0.5">
                Find Employer Portal
              </Link>
              <Link to="/login" className="rounded-full border border-white/30 px-7 py-3 text-center font-black text-white transition hover:bg-white/10">
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">FAQ</p>
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
