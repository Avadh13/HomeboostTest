import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";
import { useToast } from "../components/ToastProvider";

type PricingPlan = {
  id: number;
  title: string;
  price: string;
  description: string;
  features: string;
  button_text: string;
  button_link: string;
};

type FAQ = {
  id: number;
  question: string;
  answer: string;
  page_slug: string;
};

function Pricing() {
  const toast = useToast();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPricing = async () => {
      setLoading(true);
      try {
        const [pricingRes, faqsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/pricing`),
          fetch(`${API_BASE_URL}/faqs`),
        ]);

        const pricingData = await pricingRes.json();
        const faqData = await faqsRes.json().catch(() => []);

        if (!pricingRes.ok) {
          toast.error(pricingData.message || "Failed to load pricing.");
          setPlans([]);
        } else {
          setPlans(Array.isArray(pricingData) ? pricingData : []);
        }

        setFaqs(Array.isArray(faqData) ? faqData.filter((faq: FAQ) => faq.page_slug === "pricing") : []);
      } catch (error) {
        console.error("Pricing page load failed:", error);
        toast.error("Failed to load pricing.");
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
  }, []);

  const planStats = useMemo(() => {
    const features = plans.reduce((sum, plan) => sum + (plan.features?.split(",").filter(Boolean).length || 0), 0);
    return { plans: plans.length, features, faqs: faqs.length };
  }, [faqs.length, plans]);

  return (
    <main className="theme-page min-h-screen">
      <Navbar />

      <section className="relative px-4 py-10 md:px-6 md:py-14">
        <div className="floating-orb -left-24 top-20 h-72 w-72 bg-blue-400" />
        <div className="floating-orb right-0 top-40 h-96 w-96 bg-violet-400" />

        <div className="section-container space-y-5">
          <header className="theme-panel text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Pricing</p>
            <h1 className="mx-auto mt-3 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">Simple plans for employer home-buying benefits</h1>
            <p className="mx-auto mt-5 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-lg">
              Choose a plan that helps employees access homeownership guidance, trusted resources, and role-based support from the right Home Buying Team.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/contact" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-violet-800 hover:bg-violet-50">Talk to HomeBoost</Link>
              <Link to="/partners" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">View employer portals</Link>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              ["Plans", planStats.plans, "text-violet-700", "bg-violet-50"],
              ["Feature points", planStats.features, "text-blue-700", "bg-blue-50"],
              ["FAQ answers", planStats.faqs, "text-emerald-700", "bg-emerald-50"],
            ].map(([label, value, textTone, bgTone]) => (
              <div key={label} className="metric-card text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <h2 className={`mt-2 rounded-2xl px-3 py-2 text-3xl font-black ${textTone} ${bgTone}`}>{value}</h2>
              </div>
            ))}
          </section>

          {loading ? (
            <section className="premium-card p-8 text-center">
              <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="font-black text-slate-700">Loading pricing plans...</p>
            </section>
          ) : plans.length === 0 ? (
            <section className="premium-card p-10 text-center">
              <h2 className="text-2xl font-black text-slate-950">No pricing plans available</h2>
              <p className="mx-auto mt-2 max-w-xl text-slate-600">Pricing content can be managed from Admin → Pricing. Contact HomeBoost for plan details.</p>
              <Link to="/contact" className="btn-primary mt-6 inline-flex">Contact us</Link>
            </section>
          ) : (
            <section className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan, index) => {
                const features = plan.features?.split(",").map((feature) => feature.trim()).filter(Boolean) || [];
                const isFeatured = index === 1 || /popular|pro|growth|premium/i.test(plan.title);

                return (
                  <article key={plan.id} className={`premium-card relative flex flex-col p-6 md:p-8 ${isFeatured ? "border-violet-300 ring-4 ring-violet-100" : ""}`}>
                    {isFeatured && <span className="mb-4 w-fit rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-1.5 text-sm font-black text-white">Recommended</span>}
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">{plan.title}</h2>
                    <p className="mt-3 text-5xl font-black gradient-text">{plan.price}</p>
                    <p className="mt-5 min-h-[72px] leading-relaxed text-slate-600">{plan.description}</p>

                    <ul className="my-8 flex-1 space-y-3 text-left">
                      {features.length === 0 ? (
                        <li className="text-sm font-semibold text-slate-500">Feature details coming soon.</li>
                      ) : (
                        features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex gap-3 text-sm font-semibold text-slate-700">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))
                      )}
                    </ul>

                    <Link to={plan.button_link || "/contact"} className={isFeatured ? "btn-primary w-full justify-center" : "btn-secondary w-full justify-center"}>
                      {plan.button_text || "Get started"}
                    </Link>
                  </article>
                );
              })}
            </section>
          )}

          <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
            <div className="grid gap-0 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="p-8 md:p-10">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Need a custom plan?</p>
                <h2 className="mt-3 text-3xl font-black md:text-4xl">Launch the portal around your employer partnership model</h2>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 md:text-base">We can align portals, HBT team access, employee enrollment, resources, and appointments to your rollout.</p>
              </div>
              <div className="px-8 pb-8 lg:px-10 lg:pb-0">
                <Link to="/contact" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-slate-100">Request setup call</Link>
              </div>
            </div>
          </section>

          {faqs.length > 0 && (
            <section className="premium-card">
              <p className="eyebrow text-center">FAQ</p>
              <h2 className="mt-2 text-center text-3xl font-black tracking-tight md:text-4xl">Frequently Asked Questions</h2>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {faqs.map((faq) => (
                  <div key={faq.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <h3 className="text-lg font-black text-slate-900">{faq.question}</h3>
                    <p className="mt-2 leading-relaxed text-slate-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

export default Pricing;
