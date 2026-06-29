import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

const heroImage = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80";
const familyImage = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80";
const advisorImage = "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80";
const keysImage = "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&q=80";
const videoPoster = "https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1400&q=80";
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

const fallbackPage: Page = { id: 0, title: "Home", slug: "home", sections: [] };
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
        if (!res.ok) throw new Error(`Home page API returned ${res.status}`);
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
        setFaqs(Array.isArray(faqData) ? faqData.filter((faq: FAQ) => !faq.page_slug || faq.page_slug === "home") : []);
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
  const videoHighlights = videoSection?.cards?.length ? videoSection.cards.map((card) => card.title).filter(Boolean) : defaultVideoHighlights;

  const featureCards = useMemo(() => [
    { title: "Employer-branded portals", text: "Each employer gets a polished landing page connected to the right Home Buying Team and partnership flow.", icon: "🏢" },
    { title: "Employee guidance hub", text: "Resources, quizzes, advisor connections, events, appointments, and messages live in one simple benefit experience.", icon: "🏡" },
    { title: "HBT operation tools", text: "Teams can manage partnerships, employees, resources, events, appointments, and communication from role-based dashboards.", icon: "⚡" },
  ], []);

  const journeySteps = useMemo(() => [
    ["01", "Create partnership", "Admin or HBT creates an employer profile, slug, and team assignment."],
    ["02", "Invite employees", "Employees enter through the branded portal and land in the correct benefit experience."],
    ["03", "Guide next steps", "Resources, quizzes, messages, events, and appointments move the employee forward."],
  ], []);

  const roleCards = useMemo(() => [
    ["Admin", "Configure HBT teams, employer partnerships, CMS content, pricing, messages, and appointment oversight."],
    ["HBT Admin", "Manage companies, employees, team members, resources, events, availability, and follow-ups."],
    ["Advisor", "Reply to client messages, manage appointments, update work time, and follow up on quiz leads."],
    ["Employee", "Access resources, quizzes, messages, appointments, events, and guided home-buying support."],
  ], []);

  if (loading) {
    return (
      <main className="theme-page min-h-screen">
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
    <main className="theme-page min-h-screen overflow-hidden text-slate-950">
      <Navbar />

      {apiWarning && import.meta.env.DEV && (
        <div className="mx-auto mt-6 max-w-7xl px-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800">{apiWarning}</div>
        </div>
      )}

      <section className="relative px-4 py-12 md:px-6 lg:py-20">
        <div className="floating-orb -left-28 top-10 h-72 w-72 bg-blue-400" />
        <div className="floating-orb right-0 top-36 h-96 w-96 bg-violet-400" />
        <div className="floating-orb bottom-0 left-1/2 h-80 w-80 bg-cyan-300" />

        <div className="section-container grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-black text-blue-700 shadow-sm backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400/40" />
              One platform for employer home-buying benefits
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-7xl xl:text-8xl">
              {hero?.title || "Premium home-buying benefits for every employee."}
            </h1>

            <p className="mt-7 max-w-2xl text-xl leading-relaxed text-slate-600 md:text-2xl">
              {hero?.subtitle || "A modern employee benefit portal that turns mortgage education, trusted advisors, and next steps into one guided experience."}
            </p>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
              {hero?.content || "HomeBoost connects employer partnerships to the right Home Buying Team while giving employees resources, quizzes, events, appointments, and communication in one beautiful flow."}
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link to={hero?.button_link || "/login"} className="btn-primary">{hero?.button_text || "Open Portal"}</Link>
              <Link to="/partners" className="btn-secondary">View Employer Portals</Link>
              <Link to="/contact" className="btn-dark">Request Setup</Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[["4", "Role dashboards"], ["24/7", "Benefit access"], ["1", "Guided journey"]].map(([value, label]) => (
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
              <img src={hero?.image_url || heroImage} alt="Modern home buying benefit" className="h-[460px] w-full rounded-[2rem] object-cover md:h-[560px]" />
              <div className="glass-card absolute bottom-6 left-6 right-6 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Employer portal</p>
                    <h3 className="mt-1 text-2xl font-black">Personalized benefit entry</h3>
                    <p className="mt-1 text-sm text-slate-600">A branded route connected to the assigned Home Buying Team.</p>
                  </div>
                  <Link to="/partners" className="btn-dark px-5 py-3">Open</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container grid gap-5 md:grid-cols-3">
          {featureCards.map((card) => (
            <div key={card.title} className="metric-card group">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-3xl transition group-hover:scale-110">{card.icon}</div>
              <h3 className="text-2xl font-black tracking-tight">{card.title}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 lg:py-16">
        <div className="section-container premium-surface grid gap-8 p-5 lg:grid-cols-[0.92fr_1.08fr] lg:p-8">
          <div className="flex flex-col justify-between rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-8 text-white">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">{videoSection?.title || "Video walkthrough"}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">{videoSection?.subtitle || "Show the employee journey in seconds."}</h2>
              <p className="mt-5 text-lg leading-relaxed text-violet-100">{videoSection?.content || "Use this section for the final promo video, a Loom walkthrough, or a short demo showing how employees enter their employer portal and book next steps."}</p>
            </div>
            <div className="mt-8 grid gap-3">
              {videoHighlights.map((highlight) => (
                <div key={highlight} className="rounded-2xl bg-white/10 px-4 py-3 font-bold text-violet-50 backdrop-blur">✓ {highlight}</div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] bg-slate-950 shadow-xl">
            {isDirectVideoUrl(videoUrl) ? (
              <video src={videoUrl} poster={videoPosterUrl} controls className="aspect-video h-full w-full object-cover" />
            ) : (
              <iframe src={videoEmbedUrl} title="HomeBoost video walkthrough" className="aspect-video h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 lg:py-16">
        <div className="section-container grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {[familyImage, advisorImage, keysImage, heroImage].map((image, index) => (
              <img key={image} src={image} alt="HomeBoost benefit" className={`h-56 w-full rounded-[1.75rem] object-cover shadow-lg ${index === 1 ? "sm:mt-10" : ""}`} />
            ))}
          </div>
          <div className="premium-card">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">A clean flow from employer partnership to employee action.</h2>
            <div className="mt-8 space-y-4">
              {journeySteps.map(([step, title, text]) => (
                <div key={step} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-sm font-black text-violet-700">{step}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 lg:py-16">
        <div className="section-container">
          <div className="mb-8 text-center">
            <p className="eyebrow">Role-based platform</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Built for every user in the benefit workflow.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {roleCards.map(([role, text]) => (
              <div key={role} className="premium-card">
                <h3 className="text-2xl font-black text-slate-950">{role}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 lg:py-16">
        <div className="section-container grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="theme-panel">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">{resourceSection?.title || "Employee resources"}</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">{resourceSection?.subtitle || "Education, quizzes, events, messages, and appointments in one guided portal."}</h2>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-violet-100">{resourceSection?.content || "Give every employee a clear path to learn, ask questions, connect with advisors, and book the next conversation."}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/partners" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-violet-800 hover:bg-violet-50">Find Employer Portal</Link>
              <Link to="/contact" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Launch Partnership</Link>
            </div>
          </div>
          <div className="grid gap-4">
            {[
              ["Resources", "Guides, checklists, videos, and links."],
              ["Communication", "Employee-to-advisor messaging."],
              ["Appointments", "Advisor availability and booking flow."],
            ].map(([title, text]) => (
              <div key={title} className="premium-card">
                <h3 className="text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="px-4 py-12 md:px-6 lg:py-16">
          <div className="section-container premium-card">
            <p className="eyebrow text-center">FAQ</p>
            <h2 className="mt-2 text-center text-4xl font-black tracking-tight">Frequently Asked Questions</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {faqs.slice(0, 6).map((faq) => (
                <div key={faq.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <h3 className="text-lg font-black text-slate-900">{faq.question}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pb-16 md:px-6 lg:pb-24">
        <div className="section-container overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl md:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Ready to launch?</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Start with one employer portal, then scale.</h2>
              <p className="mt-4 max-w-3xl text-slate-300">Use HomeBoost to connect employers, employees, HBT teams, resources, quizzes, appointments, and communication.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/contact" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-slate-100">Contact HomeBoost</Link>
              <Link to="/login" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Login</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
