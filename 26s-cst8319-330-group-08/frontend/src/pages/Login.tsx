import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/api";

const loginImage =
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80";

type LoginResponse = {
  status?: string;
  message?: string;
  token?: string;
  redirect_to?: string;
  user?: {
    id: number;
    full_name: string;
    email: string;
    role: string;
    team_id?: number | null;
    partnership_id?: number | null;
  };
};

const readResponse = async (response: Response): Promise<LoginResponse> => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const navigate = useNavigate();

  const redirectByRole = (role: string, redirectTo?: string) => {
    if (redirectTo) {
      navigate(redirectTo);
      return;
    }

    if (role === "admin" || role === "super_admin") {
      navigate("/admin");
      return;
    }

    if (role === "hbt_admin") {
      navigate("/hbt/dashboard");
      return;
    }

    if (role === "hbt_member") {
      navigate("/hbt/member-dashboard");
      return;
    }

    if (role === "company_admin" || role === "company") {
      navigate("/company/dashboard");
      return;
    }

    if (role === "employee") {
      navigate("/employee-portal");
      return;
    }

    setNotice({ type: "error", message: `Unknown role: ${role}` });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!email.trim() || !password) {
      setNotice({ type: "error", message: "Email and password are required." });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || `Login failed with status ${response.status}` });
        return;
      }

      if (!data.token || !data.user) {
        setNotice({ type: "error", message: "Login response is missing token or user data." });
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setNotice({ type: "success", message: "Login successful. Redirecting..." });
      redirectByRole(data.user.role, data.redirect_to);
    } catch (error) {
      console.error("Login error:", error);
      setNotice({ type: "error", message: `Login API failed. Check backend URL: ${API_BASE_URL}/auth/login` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-[#f8f7ff] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden lg:block">
        <img src={loginImage} alt="Modern home interior" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-indigo-950/70 to-violet-900/40" />
        <Link to="/" className="absolute left-10 top-10 flex items-center gap-3 text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 font-black backdrop-blur">HB</span>
          <div>
            <p className="text-2xl font-black">HomeBoost</p>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-100">Employee Benefit</p>
          </div>
        </Link>

        <div className="absolute bottom-10 left-10 right-10 rounded-[2rem] border border-white/15 bg-white/15 p-8 text-white backdrop-blur-xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-100">One login</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Same door. Different dashboard.</h2>
          <p className="mt-4 max-w-xl text-violet-50">Admins, HBT teams, employer managers, advisors, and employees all start here. The system reads the role and sends each user to the right place.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {["Admin", "HBT", "Employer", "Employee"].map((item) => <div key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black backdrop-blur">{item}</div>)}
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center overflow-hidden px-6 py-12">
        <div className="floating-orb -right-24 top-20 h-80 w-80 bg-violet-400" />
        <div className="floating-orb -left-32 bottom-20 h-80 w-80 bg-blue-400" />

        <div className="relative w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-3 lg:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 font-black text-white shadow-lg shadow-violet-500/30">HB</span>
            <div>
              <p className="text-2xl font-black">HomeBoost</p>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600">Employee Benefit</p>
            </div>
          </Link>

          <form onSubmit={handleLogin} className="premium-card p-8">
            <p className="eyebrow">Welcome back</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Login</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Use your assigned account details to access your role-based dashboard.</p>

            {notice && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                {notice.message}
              </div>
            )}

            <div className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Email</span>
                <input className="form-field" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Password</span>
                <div className="relative">
                  <input className="form-field pr-24" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-6 w-full justify-center disabled:opacity-60">
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/80 p-4 text-sm text-slate-700">
              <p className="font-black text-violet-700">Need access?</p>
              <p className="mt-2">Employees should start from their employer portal link. Employer managers and HBT team members should use the account provided by admin.</p>
            </div>

            <div className="mt-6 grid gap-3 text-center text-sm text-slate-600">
              <p>Employee? <Link to="/partners" className="font-black text-violet-700">Start from your employer page</Link></p>
              <p>New employee account? <Link to="/signup" className="font-black text-violet-700">Create account with partnership slug</Link></p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Login;
