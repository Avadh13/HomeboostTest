import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type Invite = {
  full_name: string;
  email: string;
  employer_name?: string | null;
  partnership_slug?: string | null;
  expires_at?: string | null;
};

type SubmitEventLike = { preventDefault: () => void };

function InviteAccept() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/invites/validate/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status !== "success") throw new Error(data.message || "Invite is not valid");
        setInvite(data.invite);
        setFullName(data.invite.full_name || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Invite is not valid"))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (event: SubmitEventLike) => {
    event.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/invites/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, full_name: fullName, password }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") throw new Error(data.message || "Could not accept invite");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.redirect_to || "/employee-portal");
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
            <p className="eyebrow text-blue-600">Employee invitation</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Join your Home Buying Program portal.</h1>
            {loading ? (
              <div className="loading-state mt-8">Checking invite...</div>
            ) : error && !invite ? (
              <div className="mt-8 rounded-2xl bg-red-50 p-5 font-bold text-red-700">{error}</div>
            ) : invite ? (
              <form onSubmit={submit} className="mt-8 space-y-5">
                <div className="rounded-3xl bg-blue-50 p-5 ring-1 ring-blue-100">
                  <p className="text-sm font-black text-blue-700">{invite.employer_name || "Employer portal"}</p>
                  <p className="mt-1 font-bold text-slate-700">Invited email: {invite.email}</p>
                </div>
                <label className="grid gap-2 text-sm font-black text-slate-700">Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
                <label className="grid gap-2 text-sm font-black text-slate-700">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
                <label className="grid gap-2 text-sm font-black text-slate-700">Confirm password<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
                {error && <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}
                <div className="flex flex-wrap gap-3">
                  <button disabled={submitting} className="btn-primary disabled:opacity-60">{submitting ? "Creating account..." : "Create Employee Account"}</button>
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
