import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

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
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/pricing`)
      .then((res) => res.json())
      .then((data) => {
        setPlans(data);
        setLoading(false);
      })
      .catch(() => {
        alert("Failed to load pricing");
        setLoading(false);
      });

    fetch(`${API_BASE_URL}/faqs`)
      .then((res) => res.json())
      .then((data) => setFaqs(data.filter((faq: FAQ) => faq.page_slug === "pricing")))
      .catch(() => alert("Failed to load FAQs"));
  }, []);

  return (
    <main className="theme-page">
      <Navbar />

      <section className="px-6 py-20">
        <div className="section-container">
          <div className="theme-panel mb-12 text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">Pricing</p>
            <h1 className="mx-auto mt-3 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">Simple plans for every team</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-violet-100">
              Choose a plan that helps employees access better homeownership guidance, trusted resources, and role-based support.
            </p>
          </div>

          {loading && <p className="premium-card text-center font-bold text-slate-500">Loading pricing plans...</p>}

          {!loading && plans.length === 0 && <p className="premium-card text-center font-bold text-slate-500">No pricing plans available.</p>}

          {!loading && plans.length > 0 && (
            <div className="grid gap-8 md:grid-cols-3">
              {plans.map((plan, index) => (
                <div key={plan.id} className={`premium-card relative p-8 ${index === 1 ? "scale-[1.02] border-violet-300 ring-4 ring-violet-100" : ""}`}>
                  {index === 1 && <span className="mb-4 inline-block rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-1.5 text-sm font-black text-white">Most Popular</span>}
                  <h2 className="text-2xl font-black tracking-tight">{plan.title}</h2>
                  <p className="mt-3 text-5xl font-black gradient-text">{plan.price}</p>
                  <p className="mt-5 min-h-[72px] leading-relaxed text-slate-600">{plan.description}</p>

                  <ul className="my-8 space-y-3 text-left">
                    {plan.features
                      ?.split(",")
                      .map((feature) => feature.trim())
                      .filter(Boolean)
                      .map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex gap-3 text-sm font-semibold text-slate-700">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                  </ul>

                  {plan.button_text && (
                    <Link to={plan.button_link || "/contact"} className={index === 1 ? "btn-primary w-full" : "btn-secondary w-full"}>
                      {plan.button_text}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow text-center">FAQ</p>
            <h2 className="mt-2 text-center text-4xl font-black tracking-tight">Frequently Asked Questions</h2>
            <div className="mt-8 space-y-4">
              {faqs.map((faq) => (
                <div key={faq.id} className="premium-card p-6">
                  <h3 className="text-lg font-black text-slate-900">{faq.question}</h3>
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

export default Pricing;
