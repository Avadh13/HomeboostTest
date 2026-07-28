import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type RegistrationStatus = {
  status: string;
  payment_status: string;
  portal_ready: boolean;
  created_at?: string;
};

type StatusResponse = {
  status?: string;
  message?: string;
  registration?: RegistrationStatus;
};

const humanize = (value?: string | null) =>
  String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const validStatusToken = (value: string) => /^[A-Za-z0-9_-]{32,200}$/.test(value);

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const rawStatusToken = searchParams.get("status") || "";
  const statusToken = validStatusToken(rawStatusToken) ? rawStatusToken : "";
  const demo = searchParams.get("demo") === "1";
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null);
  const [message, setMessage] = useState(
    statusToken ? "Checking enrollment status..." : "This payment link is missing a valid status token.",
  );
  const [loadingStatus, setLoadingStatus] = useState(Boolean(statusToken));
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    if (!statusToken) return;

    try {
      setLoadingStatus(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/payments/status/${encodeURIComponent(statusToken)}`);
      const data: StatusResponse = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== "success" || !data.registration) {
        throw new Error(data.message || "Enrollment status could not be loaded.");
      }

      setRegistration(data.registration);
      setMessage(
        data.registration.portal_ready
          ? "Your Home Buying Team portal access has been prepared."
          : data.registration.payment_status === "paid"
            ? "Payment was received. Secure account activation is being prepared."
            : "Your enrollment has been recorded and is awaiting payment confirmation.",
      );
    } catch (statusError) {
      setRegistration(null);
      setError(statusError instanceof Error ? statusError.message : "Enrollment status could not be loaded.");
      setMessage("We could not confirm the enrollment status yet.");
    } finally {
      setLoadingStatus(false);
    }
  }, [statusToken]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!statusToken || demo || registration?.portal_ready || registration?.payment_status === "paid") return;

    const timer = window.setInterval(loadStatus, 5000);
    return () => window.clearInterval(timer);
  }, [demo, loadStatus, registration?.payment_status, registration?.portal_ready, statusToken]);

  const completeDemo = async () => {
    if (!statusToken) return;

    try {
      setActivating(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/payments/demo-complete/${encodeURIComponent(statusToken)}`, {
        method: "POST",
      });
      const data: StatusResponse = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Demo activation failed.");
      }

      setMessage(data.message || "Demo payment completed. Secure account activation is being prepared.");
      if (data.registration) setRegistration(data.registration);
      await loadStatus();
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : "Demo activation failed.");
    } finally {
      setActivating(false);
    }
  };

  const portalReady = Boolean(registration?.portal_ready);

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
              {statusToken ? "Thank you for joining the Employee Benefit Program." : "Invalid enrollment link."}
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
                <p className="font-black text-slate-950">Secure enrollment status</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Personal registration details are hidden on this public page.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-slate-400">Payment</p>
                    <p className="mt-1 font-black text-slate-900">{humanize(registration.payment_status)}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-slate-400">Portal</p>
                    <p className="mt-1 font-black text-slate-900">{portalReady ? "Prepared" : "Pending"}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {demo && registration && !portalReady && (
                <button disabled={activating} type="button" onClick={completeDemo} className="btn-primary disabled:opacity-60">
                  {activating ? "Activating..." : "Complete Demo Payment"}
                </button>
              )}
              {statusToken && !loadingStatus && (
                <button type="button" onClick={loadStatus} className="btn-secondary">Refresh Status</button>
              )}
              <Link to="/login" className="btn-dark">Sign In</Link>
              <Link to="/contact" className="btn-secondary">Contact Support</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PaymentSuccess;
