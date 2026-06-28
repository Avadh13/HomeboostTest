import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

const signupImage =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";

const readResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [partnershipSlug, setPartnershipSlug] = useState(searchParams.get("partnership") || "");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);

  useEffect(() => {
    setPartnershipSlug(searchParams.get("partnership") || "");
  }, [searchParams]);

  const handleEmployeeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!partnershipSlug.trim()) {
      setNotice({ type: "error", message: "Partnership slug is missing. Please sign up from your employer page." });
      return;
    }

    if (password !== confirmPassword) {
      setNotice({ type: "error", message: "Passwords do not match." });
      return;
    }

    if (password.length < 8) {
      setNotice({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          partnership_slug: partnershipSlug.trim(),
        }),
      });

      const data = await readResponse(response) as { message?: string; errors?: { message: string }[] };

      if (!response.ok) {
        const validationMessage = data.errors?.map((error) => error.message).join("\n");
        setNotice({ type: "error", message: validationMessage || data.message || `Signup failed with status ${response.status}` });
        return;
      }

      setNotice({ type: "success", message: "Account created successfully. Redirecting to login..." });
      setTimeout(() => navigate("/login"), 900);
    } catch (error) {
      console.error("Signup error:", error);
      setNotice({ type: "error", message: `Signup API failed. Check backend URL: ${API_BASE_URL}/auth/register` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="theme-page">
      <Navbar />
      <section className="relative px-6 py-14">
        <div className="floating-orb -left-24 top-20 h-80 w-80 bg-blue-400" />
        <div className="floating-orb right-0 top-40 h-96 w-96 bg-violet-400" />

        <div className="section-container premium-surface grid lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative hidden lg:block">
            <img src={signupImage} alt="Home exterior" className="h-full min-h-[720px] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-indigo-950/45 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 rounded-[2rem] border border-white/15 bg-white/15 p-6 text-white backdrop-blur-xl">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-100">Employer benefit</p>
              <h2 className="mt-2 text-4xl font-black tracking-tight">Join your home-buying portal.</h2>
              <p className="mt-3 text-violet-50">Your signup connects you to the correct employer branding and Home Buying Team content.</p>
            </div>
          </div>

          <form onSubmit={handleEmployeeSignup} className="p-8 md:p-12">
            <p className="eyebrow">Employee signup</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Create your portal account</h1>
            <p className="mt-4 max-w-2xl text-slate-600">Use your employer partnership slug to unlock your branded home-buying benefit portal.</p>

            {notice && (
              <div className={`mt-6 whitespace-pre-line rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                {notice.message}
              </div>
            )}

            <div className="mt-8 grid gap-4">
              <input className="form-field p-4" type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <input className="form-field p-4" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="form-field p-4" type="password" placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <input className="form-field p-4" type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <input className="rounded-2xl border border-violet-200 bg-violet-50/90 p-4 font-semibold text-violet-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" type="text" placeholder="Partnership Slug" value={partnershipSlug} onChange={(e) => setPartnershipSlug(e.target.value)} required />
            </div>

            <button disabled={loading} className="btn-primary mt-7 w-full disabled:opacity-60">
              {loading ? "Creating Account..." : "Create Employee Account"}
            </button>

            <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/70 p-5 text-sm text-slate-600">
              <p className="font-black text-slate-900">Employer enrollment</p>
              <p className="mt-2">Use the partnership slug provided by your employer, or start from your employer portal page.</p>
            </div>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account? <Link to="/login" className="font-black text-violet-700">Login</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Signup;
