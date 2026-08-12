import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type FAQ = { id: number; question: string; answer: string; page_slug?: string };

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
    ["Employer benefit offering", "Give employers a structured home-buying benefit they can make available to eligible employees at no employer cost."],
    ["Secure employee experience", "Invited employees use a protected portal for resources, quizzes, journeys, and communication with their assigned Home Buying Team."],
    ["Managed onboarding", "Home Buying Teams enroll through secure checkout, complete onboarding, and submit employer partnerships for Admin approval."],
  ];

  const steps = [
    ["01", "Enroll your Home Buying Team", "Submit your team information and continue to the configured Stripe checkout."],
    ["02", "Activate your secure account", "After confirmed payment, use the one-time activation process to create your password and enter the HBT portal."],
    ["03", "Prepare employer outreach", "Use approved training, resources, and program materials before submitting an employer partnership for review."],
    ["04", "Support invited employees", "Approved employers can invite employees into their secure portal, where they receive resources, journeys, quizzes, and advisor support."],
  ];

  const portalCapabilities = [
    ["HBT Portal", "Manage employer requests, employees, team members, resources, readiness, messages, and reports."],
    ["Employer Portal", "Manage invited employees, company contacts, reporting, and approved program activity."],
    ["Employee Portal", "Access assigned resources, readiness quizzes, journey progress, and secure advisor communication."],
    ["Admin Portal", "Review employer approvals, manage platform content, teams, users, partnerships, payments, and operations."],
  ];

  const defaultFaqs = [
    { id: 1, question: "Who is this program for?", answer: "The public enrollment path is for Home Buying Teams that want to offer the Employee Benefit Program through approved employer partnerships." },
    { id: 2, question: "How do employees get access?", answer: "Employees do not self-register from the public website. They receive a secure invitation from an approved employer partnership and create their password through that invitation." },
    { id: 3, question: "How do I contact the program team?", answer: "Use the Contact page to send your question to the Employee Benefit Program team before or during enrollment." },
  ];

  const faqList = faqs.length > 0 ? faqs.slice(0, 6) : defaultFaqs;

  return (
    <main className="theme-page min-h-screen overflow-hidden text-slate-950">
      <Navbar />

      <section className="relative px-4 py-12 md:px-6 lg:py-20">
        <div className="floating-orb -left-28 top-10 h-72 w-72 bg-blue-400" />
        <div className="floating-orb right-0 top-36 h-96 w-96 bg-violet-400" />

        <div className="section-container grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-black text-blue-700 shadow-sm backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Employee Benefit Program for Home Buying Teams
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-7xl xl:text-8xl">
              Bring structured home-buying support to employees.
            </h1>

            <p className="mt-7 max-w-2xl text-xl leading-relaxed text-slate-600 md:text-2xl">
              Enroll your Home Buying Team, prepare employer partnerships, and support invited employees through one secure program platform.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/hbt-signup" className="btn-primary">Enroll Your HBT</Link>
              <Link to="/login" className="btn-secondary">Sign In</Link>
              <Link to="/contact" className="btn-dark">Contact Program Team</Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[["$0", "Employer cost"], ["4", "Role portals"], ["Stripe", "Checkout provider"]].map(([value, label]) => (
                <div key={label} className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur-xl">
                  <p className="text-3xl font-black text-blue-700">{value}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-2xl shadow-blue-100/70 md:p-8">
            <p className="eyebrow">Production workflow</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">One platform, clear role boundaries.</h2>
            <div className="mt-6 space-y-3">
              {portalCapabilities.map(([title, text], index) => (
                <div key={title} className="grid grid-cols-[44px_1fr] gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">{index + 1}</span>
                  <div>
                    <h3 className="font-black text-slate-950">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container grid gap-5 md:grid-cols-3">
          {benefits.map(([title, text], index) => (
            <div key={title} className="metric-card">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-lg font-black text-blue-700">{index + 1}</div>
              <h3 className="text-2xl font-black tracking-tight">{title}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 lg:py-16">
        <div className="section-container premium-card">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 max-w-4xl text-4xl font-black tracking-tight md:text-5xl">From HBT enrollment to employee support.</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {steps.map(([step, title, text]) => (
              <div key={step} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-sm font-black text-blue-700">{step}</p>
                <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-2 leading-relaxed text-slate-600">{text}</p>
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
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Ready to begin?</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Start HBT enrollment or contact the program team.</h2>
              <p className="mt-4 max-w-3xl text-slate-300">The public site now routes only to real enrollment, authentication, and support workflows.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/hbt-signup" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-slate-100">Enroll Your HBT</Link>
              <Link to="/contact" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Contact Program Team</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
