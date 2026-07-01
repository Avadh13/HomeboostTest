import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { BRAND } from "../config/brand";
import Navbar from "../components/Navbar";
import { useToast } from "../components/ToastProvider";

type MortgageService = {
  id: number;
  service_key: string;
  title: string;
  short_title?: string | null;
  description?: string | null;
  icon?: string | null;
};

type RequestForm = {
  service_key: string;
  full_name: string;
  email: string;
  phone: string;
  preferred_contact_method: "email" | "phone" | "text" | "no_preference";
  preferred_time: string;
  message: string;
  consent: boolean;
};

type SubmitSuccess = {
  requestId: number;
  message: string;
  threadId?: number | null;
  assignedName?: string | null;
};

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

function MortgageRequest() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const selectedFromUrl = searchParams.get("service") || "";
  const token = localStorage.getItem("token");
  const user = readUser();

  const [services, setServices] = useState<MortgageService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SubmitSuccess | null>(null);
  const [form, setForm] = useState<RequestForm>({
    service_key: selectedFromUrl,
    full_name: user.full_name || "",
    email: user.email || "",
    phone: user.phone || "",
    preferred_contact_method: "no_preference",
    preferred_time: "",
    message: "",
    consent: false,
  });

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/mortgage-services`)
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;
        const loadedServices = Array.isArray(data.services) ? data.services : [];
        setServices(loadedServices);
        if (!form.service_key && loadedServices[0]?.service_key) {
          setForm((prev) => ({ ...prev, service_key: loadedServices[0].service_key }));
        }
      })
      .catch(() => toast.error("Failed to load mortgage services."))
      .finally(() => mounted && setLoadingServices(false));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedFromUrl) setForm((prev) => ({ ...prev, service_key: selectedFromUrl }));
  }, [selectedFromUrl]);

  const selectedService = useMemo(() => services.find((service) => service.service_key === form.service_key), [form.service_key, services]);

  const updateField = <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.service_key || !form.full_name.trim() || !form.email.trim()) {
      toast.warning("Please choose a service and enter your name and email.");
      return;
    }

    if (!form.consent) {
      toast.warning("Please confirm before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setSuccess(null);
      const response = await fetch(`${API_BASE_URL}/service-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...form, source: token ? "employee_portal" : "website" }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to submit mortgage request.");
        return;
      }

      setSuccess({
        requestId: data.request_id,
        message: data.next_step || "An advisor will review this request.",
        threadId: data.thread_id || null,
        assignedName: data.assigned_member_name || null,
      });
      toast.success(data.thread_id ? "Request submitted and advisor chat created." : "Mortgage request submitted.");
      setForm((prev) => ({ ...prev, preferred_time: "", message: "", consent: false }));
    } catch {
      toast.error("Failed to submit mortgage request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="relative overflow-hidden px-4 py-10 md:px-6 lg:py-14">
        <div className="floating-orb -left-24 top-20 h-72 w-72 bg-blue-400" />
        <div className="floating-orb right-0 top-20 h-80 w-80 bg-violet-400" />
        <div className="section-container relative grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="theme-panel self-start">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">Mortgage request</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Start your mortgage support request.</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">{BRAND.description}</p>

            <div className="mt-7 grid gap-3">
              {services.map((service) => {
                const active = form.service_key === service.service_key;
                return (
                  <button key={service.id} type="button" onClick={() => updateField("service_key", service.service_key)} className={`rounded-2xl border p-4 text-left transition ${active ? "border-sky-300 bg-sky-400/15 text-white" : "border-white/10 bg-white/10 text-slate-200 hover:bg-white/15"}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{service.icon || "🏡"}</span>
                      <span><span className="block font-black">{service.title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-300">{service.description}</span></span>
                    </div>
                  </button>
                );
              })}
              {loadingServices && <p className="text-sm font-bold text-slate-300">Loading services...</p>}
            </div>
          </aside>

          <form onSubmit={submitRequest} className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-2xl shadow-blue-950/10 backdrop-blur-xl md:p-7">
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Intake Form</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Tell us how we can help</h2>
                <p className="mt-2 text-sm text-slate-500">Your request is saved, assigned when possible, and a private advisor conversation is created for logged-in employees.</p>
              </div>
              {selectedService && <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">{selectedService.icon} {selectedService.short_title || selectedService.title}</span>}
            </div>

            {success && (
              <div className="mb-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                <p className="text-lg font-black">Request #{success.requestId} submitted successfully.</p>
                {success.assignedName && <p className="mt-1 text-sm font-semibold">Assigned advisor: {success.assignedName}</p>}
                <p className="mt-1 text-sm font-semibold">{success.message}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to={token ? "/employee/messages" : "/login"} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700">{success.threadId ? "Open Advisor Chat" : "Message Center"}</Link>
                  <Link to={token ? "/employee/appointments" : "/contact"} className="rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">Book Appointment</Link>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">Service needed</span><select className="form-field" value={form.service_key} onChange={(event) => updateField("service_key", event.target.value)}><option value="">Choose service</option>{services.map((service) => <option key={service.id} value={service.service_key}>{service.title}</option>)}</select></label>
              <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Full name</span><input className="form-field" value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} placeholder="Your full name" /></label>
              <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Email</span><input className="form-field" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" /></label>
              <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Phone</span><input className="form-field" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="(555) 123-4567" /></label>
              <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Preferred contact</span><select className="form-field" value={form.preferred_contact_method} onChange={(event) => updateField("preferred_contact_method", event.target.value as RequestForm["preferred_contact_method"])}><option value="no_preference">No preference</option><option value="email">Email</option><option value="phone">Phone</option><option value="text">Text</option></select></label>
              <label className="block md:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">Preferred time</span><input className="form-field" value={form.preferred_time} onChange={(event) => updateField("preferred_time", event.target.value)} placeholder="Example: Weekdays after 5 PM" /></label>
              <label className="block md:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">Details</span><textarea className="form-field min-h-[150px]" value={form.message} onChange={(event) => updateField("message", event.target.value)} placeholder="Tell the advisor what you need help with..." /></label>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              <input type="checkbox" className="mt-1" checked={form.consent} onChange={(event) => updateField("consent", event.target.checked)} />
              I confirm HomeBoost may use these details to follow up about this request.
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <Link to="/" className="rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200">Cancel</Link>
              <button disabled={submitting || loadingServices} className="rounded-full bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60">{submitting ? "Submitting..." : "Submit mortgage request"}</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default MortgageRequest;
