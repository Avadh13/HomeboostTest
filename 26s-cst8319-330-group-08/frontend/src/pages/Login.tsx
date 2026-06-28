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

    if (role === "employee") {
      navigate("/employee-portal");
      return;
    }

    setNotice({ type: "error", message: `Unknown role: ${role}` });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
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

        <div className="absolute bottom-10 left-10 right-10 rounded-[2rem] border border-white/15 bg-white/15 p-8 text-white backdrop-blur-xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-100">One login</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Same door. Different dashboard.</h2>
          <p className="mt-4 max-w-xl text-violet-50">
            Admins, HBT teams, and employees all start here. The system reads the role and sends each user to the right place.
          </p>
        </div>
      </section>

      <section className="relative flex items-center justify-center overflow-hidden px-6 py-12">
        <div className="floating-orb -right-24 top-20 h-80 w-80 bg-violet-400" />
        <div className="floating-orb -left-32 bottom-20 h-80 w-80 bg-blue-400" />

        <div className="relative w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 font-black text-white shadow-lg shadow-violet-500/30">HB</span>
            <div>
              <p className="text-2xl font-black">HomeBoost</p>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600">Employee Benefit</p>
            </div>
          </Link>

          <form onSubmit={handleLogin} className="premium-card p-8">
            <p className="eyebrow">Welcome back</p>
            <h1 className="mt-2 text-5xl font-black tracking-tight">Login</h1>
            <p className="mt-3 text-slate-600">Use your assigned account details to access your role-based dashboard.</p>

            {notice && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                {notice.message}
              </div>
            )}

            <div className="mt-7 space-y-4">
              <input className="form-field p-4" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="form-field p-4" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-6 w-full disabled:opacity-60">
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/80 p-4 text-sm text-slate-700">
              <p className="font-black text-violet-700">Need access?</p>
              <p className="mt-2">Employees should start from their employer portal link. HBT team members should use the login provided by their HBT Admin.</p>
            </div>

            <p className="mt-6 text-center text-sm text-slate-600">
              Employee? <Link to="/partners" className="font-black text-violet-700">Start from your employer page</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Login;
