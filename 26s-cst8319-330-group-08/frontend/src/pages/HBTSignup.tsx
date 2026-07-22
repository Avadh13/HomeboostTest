import { useState, type FormEvent } from "react";
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

type StartSignupResponse = {
  status?: string;
  message?: string;
  checkout_url?: string;
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

const normalizeWebsite = (value: string) => {
  const cleaned = value.trim();
  if (!cleaned) return "";
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
};

const isSafeCheckoutUrl = (value: string) => {
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
};

function HBTSignup() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof SignupForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const payload: SignupForm = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      company_name: form.company_name.trim(),
      role_title: form.role_title.trim(),
      website_url: normalizeWebsite(form.website_url),
      notes: form.notes.trim(),
    };

    if (!payload.full_name || !payload.email || !payload.company_name) {
      setError("Full name, email, and company or team name are required.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/hbt-signup/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: StartSignupResponse = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Enrollment could not be started.");
      }

      if (!data.checkout_url || !isSafeCheckoutUrl(data.checkout_url)) {
        throw new Error("The checkout service returned an invalid payment link.");
      }

      window.location.assign(data.checkout_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment could not be started.");
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
            {searchParams.get("cancelled") === "1" && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-800">
                Checkout was cancelled. Your card was not charged. You can submit the enrollment again below.
              </div>
            )}
          </div>

          <form onSubmit={submit} className="premium-card space-y-5">
            <div>
              <p className="eyebrow text-violet-600">Signup form</p>
              <h2 className="mt-2 text-3xl font-black">Create your enrollment</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">Fields marked required must be completed before checkout.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Full name *
                <input required maxLength={180} autoComplete="name" value={form.full_name} onChange={(event) => update("full_name", event.target.value)} className="form-field" />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Email *
                <input required maxLength={180} type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="form-field" />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Phone
                <input maxLength={60} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} className="form-field" />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Company / team name *
                <input required maxLength={180} autoComplete="organization" value={form.company_name} onChange={(event) => update("company_name", event.target.value)} className="form-field" />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Role title
                <input maxLength={120} autoComplete="organization-title" value={form.role_title} onChange={(event) => update("role_title", event.target.value)} className="form-field" />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Website
                <input maxLength={255} inputMode="url" placeholder="example.com" value={form.website_url} onChange={(event) => update("website_url", event.target.value)} className="form-field" />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-black text-slate-700">
              Notes
              <textarea maxLength={1500} value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={4} className="form-field" />
              <span className="text-right text-xs font-semibold text-slate-400">{form.notes.length}/1500</span>
            </label>

            {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

            <div className="flex flex-wrap gap-3">
              <button disabled={loading} type="submit" className="btn-primary disabled:opacity-60">
                {loading ? "Starting checkout..." : "Continue to Payment"}
              </button>
              <Link to="/contact" className="btn-secondary">Book Discovery Call</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default HBTSignup;
