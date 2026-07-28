import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type ActivationDetails = {
  email: string;
  role: string;
  organization: string;
  expires_at: string;
};

type ActivationResponse = {
  status?: string;
  message?: string;
  activation?: ActivationDetails;
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

const readResponse = async (response: Response): Promise<ActivationResponse> => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ActivationResponse;
  } catch {
    return { message: text };
  }
};

const validToken = (value?: string) => Boolean(value && /^[A-Za-z0-9_-]{32,200}$/.test(value));

function AccountActivation() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [activation, setActivation] = useState<ActivationDetails | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);

  useEffect(() => {
    if (!validToken(token)) {
      setNotice({ type: "error", message: "This activation link is invalid." });
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/activation/validate/${encodeURIComponent(token)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await readResponse(response);
        if (!response.ok || data.status !== "success" || !data.activation) {
          throw new Error(data.message || "This activation link is unavailable.");
        }
        setActivation(data.activation);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setNotice({
          type: "error",
          message: error instanceof Error ? error.message : "This activation link is unavailable.",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!activation || !validToken(token)) {
      setNotice({ type: "error", message: "This activation link is unavailable." });
      return;
    }
    if (password !== confirmPassword) {
      setNotice({ type: "error", message: "Passwords do not match." });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/activation/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, full_name: fullName.trim(), password }),
      });
      const data = await readResponse(response);
      if (!response.ok || data.status !== "success" || !data.token || !data.user) {
        throw new Error(data.message || "Account activation failed.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setNotice({ type: "success", message: "Account activated. Redirecting to your portal..." });
      window.setTimeout(() => navigate(data.redirect_to || "/login", { replace: true }), 700);
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Account activation failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="theme-page min-h-screen overflow-hidden text-slate-950">
      <Navbar />
      <section className="relative px-4 py-12 md:px-6 lg:py-20">
        <div className="section-container max-w-3xl">
          <div className="premium-card">
            <p className="eyebrow text-blue-600">Secure account activation</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Create your portal password.</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              This one-time link activates your Employee Benefit Program account. Your password is never sent by email or displayed on a public status page.
            </p>

            {loading && <div className="loading-state mt-8">Validating activation link...</div>}

            {notice && (
              <div
                role="alert"
                className={`mt-6 rounded-2xl border p-4 font-bold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
              >
                {notice.message}
              </div>
            )}

            {!loading && activation && (
              <>
                <div className="mt-7 grid gap-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Account</p>
                    <p className="mt-1 font-black text-slate-900">{activation.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Organization</p>
                    <p className="mt-1 font-black text-slate-900">{activation.organization}</p>
                  </div>
                </div>

                <form onSubmit={submit} className="mt-7 space-y-5">
                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    Full name
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      maxLength={180}
                      autoComplete="name"
                      className="form-field"
                      placeholder="Your full name"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    Create password
                    <div className="relative">
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        className="form-field pr-24"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </label>

                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    Confirm password
                    <input
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="form-field"
                    />
                  </label>

                  <div className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold leading-relaxed text-blue-900">
                    Use at least eight characters with an uppercase letter, lowercase letter, and number.
                  </div>

                  <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-60">
                    {submitting ? "Activating account..." : "Activate Account"}
                  </button>
                </form>
              </>
            )}

            {!loading && !activation && (
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/contact" className="btn-primary">Contact Support</Link>
                <Link to="/login" className="btn-secondary">Return to Login</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default AccountActivation;
