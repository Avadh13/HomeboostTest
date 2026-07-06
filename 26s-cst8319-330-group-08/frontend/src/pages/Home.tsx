import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

const heroImage = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80";
const advisorImage = "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80";
const meetingImage = "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80";
const videoPoster = "https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1400&q=80";
const demoVideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

type FAQ = { id: number; question: string; answer: string; page_slug?: string };

const isDirectVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?.*)?$/i.test(url);

function Home() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/faqs`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFaqs(Array.isArray(data) ? data.filter((faq: FAQ) => !faq.page_slug || faq.page_slug === "home") : []))
      .catch(() => setFaqs([]))
      .finally(() => setLoadingFaqs(false));
  }, []);

  const benefits = [
    ["Attract stronger employer partners", "Give employers a no-cost benefit that helps employees feel supported in one of life's biggest financial decisions."],
    ["Create warm home-buyer conversations", "Home Buying Teams can educate employees, build trust, and connect with people who are preparing to buy."],
    ["Simple enrollment path", "Teams can sign up, complete payment, and move into the HBT portal for training and employer outreach."],
  ];

  const steps = [
    ["01", "Learn about the program", "Review how the Employee Benefit Program helps Home Buying Teams approach employers with a strong benefit offer."],
    ["02", "Sign up and complete payment", "Register your team and complete secure checkout to begin the onboarding process."],
    ["03", "Access the HBT portal", "Use training, resources, and employer recruitment tools inside the secure Home Buying Team portal."],
    ["04", "Launch with employers", "Approach employers, set up the company contact, and invite employees into the Home Buying Program."],
  ];

  const defaultFaqs = [
    { id: 1, question: "Who is this program for?", answer: "It is designed for Home Buying Teams such as mortgage brokers, real estate professionals, and partner advisors who want to offer a structured employee home-buying benefit." },
    { id: 2, question: "Is this the employee portal?", answer: "No. This public website explains the program and helps Home Buying Teams enroll. Employees use the secure portal after they are invited by an employer or Home Buying Team." },
    { id: 3, question: "Can I book a discovery call first?", answer: "Yes. Prospective Home Buying Teams can book a discovery call with Kelly before enrolling." },
  ];

  const faqList = faqs.length > 0 ? faqs.slice(0, 6) : defaultFaqs;

  return (
    <main className="theme-page min-h-screen overflow-hidden text-slate-950">
      <Navbar />

      <section className="relative px-4 py-12 md:px-6 lg:py-20">
        <div className="floating-orb -left-28 top-10 h-72 w-72 bg-blue-400" />
        <div className="floating-orb right-0 top-36 h-96 w-96 bg-violet-400" />
        <div className="floating-orb bottom-0 left-1/2 h-80 w-80 bg-cyan-300" />

        <div className="section-container grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-black text-blue-700 shadow-sm backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400/40" />
              Employee Benefit Program for Home Buying Teams
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-7xl xl:text-8xl">
              Bring a home-buying benefit to employers.
            </h1>

            <p className="mt-7 max-w-2xl text-xl leading-relaxed text-slate-600 md:text-2xl">
              The Home Buying Program helps Home Buying Teams educate employers, support employees, and create meaningful home-buyer conversations through a structured benefit platform.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
              This public site is for Home Buying Teams to learn about the program, register, complete payment, and access the secure HBT portal after enrollment.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/hbt-signup" className="btn-primary">Sign Up</Link>
              <Link to="/login" className="btn-secondary">Sign In</Link>
              <Link to="/contact" className="btn-dark">Book Discovery Call</Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[["0$", "Cost to employers"], ["HBT", "Team portal"], ["Stripe", "Secure checkout"]].map(([value, label]) => (
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
              <img src={heroImage} alt="Home Buying Program" className="h-[460px] w-full rounded-[2rem] object-cover md:h-[560px]" />
              <div className="glass-card absolute bottom-6 left-6 right-6 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Program enrollment</p>
                <h3 className="mt-1 text-2xl font-black">Register your Home Buying Team</h3>
                <p className="mt-1 text-sm text-slate-600">Enroll, complete payment, and move into the secure HBT portal.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container grid gap-5 md:grid-cols-3">
          {benefits.map(([title, text]) => (
            <div key={title} className="metric-card group">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-3xl transition group-hover:scale-110">🏡</div>
              <h3 className="text-2xl font-black tracking-tight">{title}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 lg:py-16">
        <div className="section-container premium-surface grid gap-8 p-5 lg:grid-cols-[0.92fr_1.08fr] lg:p-8">
          <div className="flex flex-col justify-between rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-8 text-white">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">Video walkthrough</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">See how the employee portal experience works.</h2>
              <p className="mt-5 text-lg leading-relaxed text-violet-100">Use this section for Kelly's final program demo video, a Loom walkthrough, or a short overview of how employees complete onboarding and connect with their Home Buying Team.</p>
            </div>
            <div className="mt-8 grid gap-3">
              {["Program overview", "Employee portal demo", "HBT advisor workflow"].map((highlight) => (
                <div key={highlight} className="rounded-2xl bg-white/10 px-4 py-3 font-bold text-violet-50 backdrop-blur">✓ {highlight}</div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] bg-slate-950 shadow-xl">
            {isDirectVideoUrl(demoVideoUrl) ? (
              <video src={demoVideoUrl} poster={videoPoster} controls className="aspect-video h-full w-full object-cover" />
            ) : (
              <iframe src={demoVideoUrl} title="Home Buying Program video walkthrough" className="aspect-video h-full w-full" allowFullScreen />
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 lg:py-16">
        <div className="section-container grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {[advisorImage, meetingImage].map((image, index) => (
              <img key={image} src={image} alt="Home Buying Team consultation" className={`h-72 w-full rounded-[1.75rem] object-cover shadow-lg ${index === 1 ? "sm:mt-10" : ""}`} />
            ))}
          </div>
          <div className="premium-card">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">A clear path from program interest to HBT portal access.</h2>
            <div className="mt-8 space-y-4">
              {steps.map(([step, title, text]) => (
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
        <div className="section-container grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="theme-panel">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">Built for Home Buying Teams</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Training, resources, and employer outreach in one secure portal.</h2>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-violet-100">After enrollment, teams access the HBT portal to complete training, use program materials, and begin recruiting participating employers.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/hbt-signup" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-violet-800 hover:bg-violet-50">Sign Up</Link>
              <Link to="/contact" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Book Discovery Call</Link>
            </div>
          </div>
          <div className="grid gap-4">
            {[
              ["Course portal", "Training content and course progress for enrolled teams."],
              ["Employer recruitment", "Resources and referral materials to approach employers."],
              ["Employee support", "A secure portal where invited employees receive guidance and connect with advisors."]
            ].map(([title, text]) => (
              <div key={title} className="premium-card">
                <h3 className="text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!loadingFaqs && faqList.length > 0 && (
        <section className="px-4 py-12 md:px-6 lg:py-16">
          <div className="section-container premium-card">
            <p className="eyebrow text-center">FAQ</p>
            <h2 className="mt-2 text-center text-4xl font-black tracking-tight">Frequently Asked Questions</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {faqList.map((faq) => (
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
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Ready to learn more?</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Connect with Kelly about bringing the Home Buying Program to your market.</h2>
              <p className="mt-4 max-w-3xl text-slate-300">Book a discovery call or start enrollment when your Home Buying Team is ready.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/contact" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-slate-100">Book Discovery Call</Link>
              <Link to="/hbt-signup" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Sign Up</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
