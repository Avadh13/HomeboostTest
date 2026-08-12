import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/api";
import BrandLogo from "../components/BrandLogo";
import { readStoredToken, readStoredUser } from "../utils/auth";
import { dashboardPathForRole } from "../utils/routes";

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

type LoginLocationState = { from?: string };

const readResponse = async (response: Response): Promise<LoginResponse> => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const safeInternalPath = (value?: string) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath = safeInternalPath((location.state as LoginLocationState | null)?.from);

  useEffect(() => {
    const existingUser = readStoredUser();
    if (readStoredToken() && existingUser?.role) {
      navigate(dashboardPathForRole(existingUser.role), { replace: true });
    }
  }, [navigate]);

  const redirectAfterLogin = (role: string, redirectTo?: string) => {
    const target = requestedPath || safeInternalPath(redirectTo) || dashboardPathForRole(role);
    navigate(target, { replace: true });
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setNotice({ type: "error", message: "Email and password are required." });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const data = await readResponse(response);

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || `Login failed with status ${response.status}` });
        return;
      }
      if (!data.token || !data.user?.role) {
        setNotice({ type: "error", message: "Login response is missing required account data." });
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setNotice({ type: "success", message: "Login successful. Redirecting..." });
      redirectAfterLogin(data.user.role, data.redirect_to);
    } catch {
      setNotice({ type: "error", message: "Login service is temporarily unavailable. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
      <section className="relative hidden h-screen overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="inline-flex w-fit rounded-3xl bg-white px-4 py-3 shadow-lg">
          <BrandLogo className="h-14 w-[230px]" />
        </Link>

        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">Secure role-based access</p>
          <h2 className="mt-4 text-5xl font-black tracking-tight">One sign-in. The correct portal for your role.</h2>
          <p className="mt-5 text-lg leading-relaxed text-blue-100">
            Admins, Home Buying Teams, employer managers, advisors, and employees are routed to the portal assigned to their active account.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ["Admin", "Platform operations and approvals"],
              ["HBT", "Employer and employee support"],
              ["Employer", "Invitations and company reporting"],
              ["Employee", "Resources, journey, quizzes, and advisor support"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="font-black">{title}</p>
                <p className="mt-1 text-sm text-blue-100">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm font-semibold text-blue-200">Employee Benefit Program</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-6 lg:h-screen lg:min-h-0 lg:px-10 lg:py-4">
        <div className="floating-orb -right-24 top-20 h-80 w-80 bg-violet-400" />
        <div className="floating-orb -left-32 bottom-20 h-80 w-80 bg-blue-400" />

        <div className="relative w-full max-w-[620px]">
          <Link to="/" className="mb-6 inline-flex rounded-3xl bg-white px-4 py-3 shadow-lg lg:hidden">
            <BrandLogo className="h-14 w-[230px]" />
          </Link>

          <form onSubmit={handleLogin} className="premium-card p-6 sm:p-7 xl:p-8">
            <p className="eyebrow">Welcome back</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight xl:text-5xl">Login</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 xl:mt-3">Use the credentials created through your approved account or invitation activation.</p>

            {requestedPath && (
              <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                Sign in to continue to the requested portal page.
              </p>
            )}

            {notice && (
              <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                {notice.message}
              </div>
            )}

            <div className="mt-5 space-y-3 xl:mt-6 xl:space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Email</span>
                <input className="form-field" type="email" inputMode="email" autoComplete="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Password</span>
                <div className="relative">
                  <input className="form-field pr-24" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-5 w-full justify-center disabled:opacity-60 xl:mt-6">
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700 xl:mt-6">
              <p className="font-black text-blue-700">Need account access?</p>
              <p className="mt-2 leading-relaxed">Employees and employer managers must use the secure invitation or activation link sent for their approved partnership. Home Buying Team users receive account activation from the program administrator.</p>
            </div>

            <div className="mt-4 grid gap-2 text-center text-sm text-slate-600 xl:mt-5">
              <p>Employee? <Link to="/partners" className="font-black text-blue-700">Find your employer portal</Link></p>
              <p>Missing an invitation? <Link to="/contact" className="font-black text-blue-700">Contact program support</Link></p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Login;
