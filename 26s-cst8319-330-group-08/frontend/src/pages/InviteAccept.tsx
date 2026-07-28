import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type Invite = {
  full_name: string;
  email: string;
  invite_role?: "employee" | "company" | "company_admin";
  employer_name?: string | null;
  partnership_slug?: string | null;
  expires_at?: string | null;
};

type SubmitEventLike = { preventDefault: () => void };

const validCredential = (value: string) => /^[A-Za-z0-9_-]{32,200}$/.test(value) || /^\d{6}$/.test(value);
const passwordError = (value: string) => {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(value)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(value)) return "Password must include an uppercase letter.";
  if (!/\d/.test(value)) return "Password must include a number.";
  return "";
};

function InviteAccept() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isCompanyManagerInvite = useMemo(
    () => invite?.invite_role === "company" || invite?.invite_role === "company_admin",
    [invite?.invite_role],
  );

  useEffect(() => {
    if (!validCredential(token)) {
      setError("Invite is not valid");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/invites/validate/${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.status !== "success") throw new Error(data.message || "Invite is not valid");
        setInvite(data.invite);
        setFullName(data.invite.full_name || "");
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Invite is not valid");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  const submit = async (event: SubmitEventLike) => {
    event.preventDefault();
    setError("");
    const validationError = passwordError(password);
    if (validationError) return setError(validationError);
    if (password !== confirm) return setError("Passwords do not match.");

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/invites/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, full_name: fullName, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== "success" || !data.token || !data.user) {
        throw new Error(data.message || "Could not accept invite");
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.redirect_to || "/employee-portal", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite");
      setSubmitting(false);
    }
  };

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-10 md:px-6 lg:py-16">
        <div className="section-container max-w-4xl">
          <div className="premium-card">
            <p className="eyebrow text-blue-600">{isCompanyManagerInvite ? "Company Manager invitation" : "Employee invitation"}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
              {isCompanyManagerInvite ? "Activate your employer portal." : "Join your Employee Benefit Program portal."}
            </h1>
            {loading ? (
              <div className="loading-state mt-8">Checking invite...</div>
            ) : error && !invite ? (
              <div className="mt-8 rounded-2xl bg-red-50 p-5 font-bold text-red-700">{error}</div>
            ) : invite ? (
              <form onSubmit={submit} className="mt-8 space-y-5">
                <div className="rounded-3xl bg-blue-50 p-5 ring-1 ring-blue-100">
                  <p className="text-sm font-black text-blue-700">{invite.employer_name || "Employer portal"}</p>
                  <p className="mt-1 font-bold text-slate-700">Invited email: {invite.email}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {isCompanyManagerInvite
                      ? "Create your Company Manager account to manage employees, invitations, branding, and reports."
                      : "Create your employee account to access your personalized portal."}
                  </p>
                </div>
                <label className="grid gap-2 text-sm font-black text-slate-700">Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={255} required className="form-field" /></label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Password
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" required className="form-field pr-24" />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{showPassword ? "Hide" : "Show"}</button>
                  </div>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">Confirm password<input type={showPassword ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} autoComplete="new-password" required className="form-field" /></label>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">Use at least eight characters with an uppercase letter, lowercase letter, and number.</div>
                {error && <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}
                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
                    {submitting ? "Creating account..." : isCompanyManagerInvite ? "Create Company Manager Account" : "Create Employee Account"}
                  </button>
                  <Link to="/login" className="btn-secondary">Already have account?</Link>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default InviteAccept;
