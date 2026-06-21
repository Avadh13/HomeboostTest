import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

const signupImage =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";

function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [partnershipSlug, setPartnershipSlug] = useState(searchParams.get("partnership") || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPartnershipSlug(searchParams.get("partnership") || "");
  }, [searchParams]);

  const handleEmployeeSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partnershipSlug) {
      alert("Partnership slug is missing. Please sign up from your employer page.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, password, partnership_slug: partnershipSlug }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Signup failed");
        return;
      }

      alert("Account created successfully. Please login.");
      navigate("/login");
    } catch {
      alert("Backend is not running or signup API failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <section className="relative px-6 py-14">
        <div className="floating-orb -left-24 top-20 h-80 w-80 bg-blue-400" />
        <div className="floating-orb right-0 top-40 h-96 w-96 bg-indigo-400" />

        <div className="relative mx-auto grid max-w-7xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative hidden lg:block">
            <img src={signupImage} alt="Home exterior" className="h-full min-h-[720px] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 rounded-[2rem] bg-white/15 p-6 text-white backdrop-blur-xl">
              <h2 className="text-3xl font-black">Join your employer benefit program.</h2>
              <p className="mt-3 text-blue-50">Your signup connects you to the correct employer branding and Home Buying Team content.</p>
            </div>
          </div>

          <form onSubmit={handleEmployeeSignup} className="p-8 md:p-12">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">Employee signup</p>
            <h1 className="mt-3 text-4xl font-black md:text-5xl">Create your portal account</h1>
            <p className="mt-4 max-w-2xl text-slate-600">Use your employer partnership slug to unlock your branded home-buying benefit portal.</p>

            <div className="mt-8 grid gap-4">
              <input className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <input className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" type="password" placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <input className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <input className="rounded-2xl border border-blue-200 bg-blue-50 p-4 font-semibold text-blue-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" type="text" placeholder="Partnership Slug" value={partnershipSlug} onChange={(e) => setPartnershipSlug(e.target.value)} required />
            </div>

            <button disabled={loading} className="btn-primary mt-7 w-full disabled:opacity-60">
              {loading ? "Creating Account..." : "Create Employee Account"}
            </button>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
              <p className="font-black text-slate-900">Employer enrollment</p>
              <p className="mt-2">Use the partnership slug provided by your employer, or start from your employer portal page.</p>
            </div>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account? <Link to="/login" className="font-bold text-blue-700">Login</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Signup;
