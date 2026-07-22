import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type Registration = {
  id: number;
  full_name: string;
  email: string;
  company_name: string;
  status: string;
  payment_status: string;
  team_id?: number | null;
  user_id?: number | null;
};

type PortalAccess = {
  login_email?: string;
  login_url?: string;
  initial_password?: string;
  already_created?: boolean;
};

type StatusResponse = {
  status?: string;
  message?: string;
  registration?: Registration;
};

const humanize = (value?: string | null) =>
  String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const rawRegistrationId = searchParams.get("registration") || "";
  const registrationId = /^\d+$/.test(rawRegistrationId) ? rawRegistrationId : "";
  const demo = searchParams.get("demo") === "1";
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [access, setAccess] = useState<PortalAccess | null>(null);
  const [message, setMessage] = useState(
    registrationId ? "Checking enrollment status..." : "This payment link is missing a valid registration number.",
  );
  const [loadingStatus, setLoadingStatus] = useState(Boolean(registrationId));
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    if (!registrationId) return;

    try {
      setLoadingStatus(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/payments/status/${registrationId}`);
      const data: StatusResponse = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== "success" || !data.registration) {
        throw new Error(data.message || "Enrollment status could not be loaded.");
      }

      setRegistration(data.registration);
      setMessage(
        data.registration.team_id
          ? "Your HBT portal access has been created."
          : data.registration.payment_status === "paid"
            ? "Payment was received. Portal access is being prepared."
            : "Your enrollment has been recorded and is awaiting payment confirmation.",
      );
    } catch (statusError) {
      setRegistration(null);
      setError(statusError instanceof Error ? statusError.message : "Enrollment status could not be loaded.");
      setMessage("We could not confirm the enrollment status yet.");
    } finally {
      setLoadingStatus(false);
    }
  }, [registrationId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!registrationId || demo || registration?.team_id || registration?.payment_status === "paid") return;

    const timer = window.setInterval(loadStatus, 5000);
    return () => window.clearInterval(timer);
  }, [demo, loadStatus, registration?.payment_status, registration?.team_id, registrationId]);

  const completeDemo = async () => {
    if (!registrationId) return;

    try {
      setActivating(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/payments/demo-complete/${registrationId}`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Demo activation failed.");
      }

      setAccess(data.access || null);
      setMessage(data.message || "Demo payment completed. HBT portal access was created.");
      await loadStatus();
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : "Demo activation failed.");
    } finally {
      setActivating(false);
    }
  };

  const portalReady = Boolean(registration?.team_id || access?.already_created || access?.login_email);

  return (
    <main className="theme-page min-h-screen overflow-hidden text-slate-950">
      <Navbar />
      <section className="relative px-4 py-12 md:px-6 lg:py-20">
        <div className="floating-orb -left-28 top-12 h-72 w-72 bg-emerald-400" />
        <div className="floating-orb right-0 top-48 h-96 w-96 bg-blue-400" />
        <div className="section-container max-w-4xl">
          <div className="premium-card text-center">
            <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-4xl ${error ? "bg-amber-100" : "bg-emerald-100"}`}>
              {error ? "!" : "✓"}
            </div>
            <p className="eyebrow text-emerald-600">Enrollment status</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
              {registrationId ? "Thank you for joining the Home Buying Program." : "Invalid enrollment link."}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              {loadingStatus ? "Checking enrollment status..." : message}
            </p>

            {error && (
              <div role="alert" className="mx-auto mt-6 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left font-bold text-amber-800">
                {error}
              </div>
            )}

            {registration && (
              <div className="mx-auto mt-8 max-w-2xl rounded-[1.5rem] bg-slate-50 p-5 text-left">
                <p className="font-black text-slate-950">{registration.company_name}</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-500">{registration.full_name} · {registration.email}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-slate-400">Payment</p>
                    <p className="mt-1 font-black text-slate-900">{humanize(registration.payment_status)}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-slate-400">Portal</p>
                    <p className="mt-1 font-black text-slate-900">{portalReady ? "Created" : "Pending"}</p>
                  </div>
                </div>
              </div>
            )}

            {access?.initial_password && (
              <div className="mx-auto mt-6 max-w-2xl rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-left text-emerald-900">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Temporary demo credentials</p>
                <p className="mt-3 text-sm font-bold">Use these credentials only for testing and change the password before production use.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-slate-400">Email</p>
                    <p className="mt-1 break-all font-black text-slate-900">{access.login_email}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-slate-400">Temporary password</p>
                    <p className="mt-1 break-all font-black text-slate-900">{access.initial_password}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {demo && registration && !portalReady && (
                <button disabled={activating} type="button" onClick={completeDemo} className="btn-primary disabled:opacity-60">
                  {activating ? "Activating..." : "Complete Demo Activation"}
                </button>
              )}
              {registrationId && !loadingStatus && (
                <button type="button" onClick={loadStatus} className="btn-secondary">Refresh Status</button>
              )}
              <Link to="/login" className="btn-dark">Sign In</Link>
              <Link to="/contact" className="btn-secondary">Contact Kelly</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PaymentSuccess;
