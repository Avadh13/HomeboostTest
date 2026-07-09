import { useEffect, useState } from "react";
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

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get("registration");
  const demo = searchParams.get("demo") === "1";
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [access, setAccess] = useState<PortalAccess | null>(null);
  const [message, setMessage] = useState("Checking enrollment status...");
  const [loading, setLoading] = useState(false);

  const loadStatus = () => {
    if (!registrationId) return;
    fetch(`${API_BASE_URL}/payments/status/${registrationId}`)
      .then((response) => response.json())
      .then((data) => {
        setRegistration(data.registration || null);
        setMessage(data.registration?.team_id ? "Your HBT portal access has been created." : "Payment received. Portal access will be activated shortly.");
      })
      .catch(() => setMessage("We could not load the enrollment status yet."));
  };

  useEffect(() => {
    loadStatus();
  }, [registrationId]);

  const completeDemo = async () => {
    if (!registrationId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/payments/demo-complete/${registrationId}`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (data.access) setAccess(data.access);
      setMessage(data.message || "Demo payment completed. HBT portal access created.");
      loadStatus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="theme-page min-h-screen overflow-hidden text-slate-950">
      <Navbar />
      <section className="relative px-4 py-12 md:px-6 lg:py-20">
        <div className="floating-orb -left-28 top-12 h-72 w-72 bg-emerald-400" />
        <div className="floating-orb right-0 top-48 h-96 w-96 bg-blue-400" />
        <div className="section-container max-w-4xl">
          <div className="premium-card text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">✓</div>
            <p className="eyebrow text-emerald-600">Enrollment submitted</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Thank you for joining the Home Buying Program.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{message}</p>

            {registration && (
              <div className="mx-auto mt-8 max-w-2xl rounded-[1.5rem] bg-slate-50 p-5 text-left">
                <p className="font-black text-slate-950">{registration.company_name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{registration.full_name} · {registration.email}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-400">Payment</p><p className="mt-1 font-black text-slate-900">{registration.payment_status}</p></div>
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-400">Portal</p><p className="mt-1 font-black text-slate-900">{registration.team_id ? "Created" : "Pending"}</p></div>
                </div>
              </div>
            )}

            {access?.initial_password && (
              <div className="mx-auto mt-6 max-w-2xl rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-left text-emerald-900">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Demo portal credentials</p>
                <p className="mt-3 text-sm font-bold">Use these once for testing. Change this password before real client launch.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-400">Email</p><p className="mt-1 break-all font-black text-slate-900">{access.login_email}</p></div>
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-400">Temporary password</p><p className="mt-1 break-all font-black text-slate-900">{access.initial_password}</p></div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {demo && !registration?.team_id && <button disabled={loading} onClick={completeDemo} className="btn-primary disabled:opacity-60">{loading ? "Activating..." : "Complete Demo Activation"}</button>}
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
