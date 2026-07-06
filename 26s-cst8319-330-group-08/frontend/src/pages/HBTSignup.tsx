import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type SignupForm = {
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  role_title: string;
  website_url: string;
  notes: string;
};

type SubmitEventLike = {
  preventDefault: () => void;
};

const initialForm: SignupForm = {
  full_name: "",
  email: "",
  phone: "",
  company_name: "",
  role_title: "",
  website_url: "",
  notes: "",
};

function HBTSignup() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof SignupForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: SubmitEventLike) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/hbt-signup/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") throw new Error(data.message || "Signup could not be started");
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup could not be started");
      setLoading(false);
    }
  };

  return (
    <main className="theme-page min-h-screen overflow-hidden text-slate-950">
      <Navbar />
      <section className="relative px-4 py-10 md:px-6 lg:py-16">
        <div className="floating-orb -left-28 top-12 h-72 w-72 bg-blue-400" />
        <div className="floating-orb right-0 top-48 h-96 w-96 bg-violet-400" />
        <div className="section-container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="premium-card">
            <p className="eyebrow text-blue-600">Home Buying Program Enrollment</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Join as a Home Buying Team.</h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Register your team, complete payment, and get access to the HBT portal for training, resources, and employer outreach tools.
            </p>
            <div className="mt-8 grid gap-4">
              {["Program registration", "Secure checkout", "HBT portal access", "Training and employer recruitment tools"].map((item) => (
                <div key={item} className="rounded-2xl bg-blue-50 px-4 py-3 font-black text-blue-800">✓ {item}</div>
              ))}
            </div>
            {searchParams.get("cancelled") && <div className="mt-6 rounded-2xl bg-amber-50 p-4 font-bold text-amber-800">Checkout was cancelled. You can continue the registration below.</div>}
          </div>

          <form onSubmit={submit} className="premium-card space-y-5">
            <div>
              <p className="eyebrow text-violet-600">Signup form</p>
              <h2 className="mt-2 text-3xl font-black">Create your enrollment</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">Full name<input required value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
              <label className="grid gap-2 text-sm font-black text-slate-700">Email<input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
              <label className="grid gap-2 text-sm font-black text-slate-700">Phone<input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
              <label className="grid gap-2 text-sm font-black text-slate-700">Company / team name<input required value={form.company_name} onChange={(e) => update("company_name", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
              <label className="grid gap-2 text-sm font-black text-slate-700">Role title<input value={form.role_title} onChange={(e) => update("role_title", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
              <label className="grid gap-2 text-sm font-black text-slate-700">Website<input value={form.website_url} onChange={(e) => update("website_url", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
            </div>

            <label className="grid gap-2 text-sm font-black text-slate-700">Notes<textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>

            {error && <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}

            <div className="flex flex-wrap gap-3">
              <button disabled={loading} type="submit" className="btn-primary disabled:opacity-60">{loading ? "Starting checkout..." : "Continue to Payment"}</button>
              <Link to="/contact" className="btn-secondary">Book Discovery Call</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default HBTSignup;
