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
      .then((data) =>
        setFaqs(data.filter((faq: FAQ) => faq.page_slug === "pricing"))
      )
      .catch(() => alert("Failed to load FAQs"));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto text-center mb-12">
          <p className="text-sm font-semibold tracking-wide text-gray-500 uppercase mb-3">
            Pricing
          </p>

          <h1 className="text-5xl font-extrabold mb-5">
            Simple plans for every team
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose a plan that helps your employees access better homeownership
            support, resources, and guidance.
          </p>
        </div>

        {loading && (
          <p className="text-center text-gray-500">Loading pricing plans...</p>
        )}

        {!loading && plans.length === 0 && (
          <p className="text-center text-gray-500">
            No pricing plans available.
          </p>
        )}

        {!loading && plans.length > 0 && (
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`bg-white p-8 rounded-2xl shadow-sm border ${
                  index === 1
                    ? "border-black shadow-lg scale-[1.02]"
                    : "border-gray-200"
                }`}
              >
                {index === 1 && (
                  <span className="inline-block bg-black text-white text-sm px-3 py-1 rounded-full mb-4">
                    Most Popular
                  </span>
                )}

                <h2 className="text-2xl font-bold mb-2">{plan.title}</h2>

                <p className="text-4xl font-extrabold mb-4">{plan.price}</p>

                <p className="text-gray-600 mb-6 min-h-[72px]">
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-8 text-left">
                  {plan.features
                    ?.split(",")
                    .map((feature) => feature.trim())
                    .filter(Boolean)
                    .map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex gap-2">
                        <span className="font-bold">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                </ul>

                {plan.button_text && (
                  <Link
                    to={plan.button_link || "/contact"}
                    className={`block text-center px-6 py-3 rounded-lg font-medium transition ${
                      index === 1
                        ? "bg-black text-white hover:bg-gray-800"
                        : "border border-black text-black hover:bg-black hover:text-white"
                    }`}
                  >
                    {plan.button_text}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {faqs.length > 0 && (
        <section className="px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-white p-6 rounded-xl shadow-sm border"
                >
                  <h3 className="font-bold text-lg mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
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