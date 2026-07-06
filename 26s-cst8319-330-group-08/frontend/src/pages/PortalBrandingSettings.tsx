import { useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type BrandingForm = {
  partnership_id: string;
  portal_title: string;
  welcome_message: string;
  prompt_text: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
};

type SubmitEventLike = { preventDefault: () => void };

const initialForm: BrandingForm = {
  partnership_id: "",
  portal_title: "",
  welcome_message: "",
  prompt_text: "",
  logo_url: "",
  primary_color: "#2563eb",
  secondary_color: "#f8fafc",
  footer_text: "",
};

function PortalBrandingSettings() {
  const [form, setForm] = useState<BrandingForm>(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { ...initialForm, partnership_id: user?.partnership_id ? String(user.partnership_id) : "" };
  });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const update = (field: keyof BrandingForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const loadSettings = async () => {
    if (!form.partnership_id) return setNotice("Enter a partnership ID first.");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/portal-branding/partnership/${form.partnership_id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok || data.status !== "success") throw new Error(data.message || "Could not load branding");
      const settings = data.settings || {};
      setForm((current) => ({
        ...current,
        portal_title: settings.portal_title || `${settings.employer_name || "Employer"} Home Buying Portal`,
        welcome_message: settings.welcome_message || "",
        prompt_text: settings.prompt_text || "",
        logo_url: settings.logo_url || settings.employer_logo_url || "",
        primary_color: settings.primary_color || settings.brand_primary_color || "#2563eb",
        secondary_color: settings.secondary_color || settings.brand_secondary_color || "#f8fafc",
        footer_text: settings.footer_text || "",
      }));
      setNotice("Branding loaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load branding.");
    } finally {
      setLoading(false);
    }
  };

  const save = async (event: SubmitEventLike) => {
    event.preventDefault();
    if (!form.partnership_id) return setNotice("Partnership ID is required.");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/portal-branding/partnership/${form.partnership_id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") throw new Error(data.message || "Could not save branding");
      setNotice("Portal branding saved and published.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save branding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container grid gap-6 lg:grid-cols-[420px_1fr]">
          <aside className="premium-card h-fit">
            <p className="eyebrow text-blue-600">Employer Branded Portal</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Customize the employee portal.</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">Set the employer title, logo, welcome message, prompt text, and colors shown to employees.</p>
            <div className="mt-6 rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${form.primary_color}, #111827)` }}>
              <p className="text-xs font-black uppercase text-white/70">Live preview</p>
              <h2 className="mt-2 text-2xl font-black">{form.portal_title || "Employer Home Buying Portal"}</h2>
              <p className="mt-2 text-sm text-white/80">{form.prompt_text || "Your custom employee prompt appears here."}</p>
            </div>
          </aside>

          <form onSubmit={save} className="premium-card space-y-5">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <label className="grid gap-2 text-sm font-black text-slate-700">Partnership ID<input value={form.partnership_id} onChange={(e) => update("partnership_id", e.target.value)} required className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
              <button type="button" onClick={loadSettings} disabled={loading} className="btn-secondary disabled:opacity-60">Load</button>
            </div>
            <label className="grid gap-2 text-sm font-black text-slate-700">Portal title<input value={form.portal_title} onChange={(e) => update("portal_title", e.target.value)} placeholder="Joe's Smokeshop Home Buying Portal" className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
            <label className="grid gap-2 text-sm font-black text-slate-700">Logo URL<input value={form.logo_url} onChange={(e) => update("logo_url", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">Primary color<input type="color" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="h-14 rounded-2xl border border-slate-200 px-3 py-2" /></label>
              <label className="grid gap-2 text-sm font-black text-slate-700">Secondary color<input type="color" value={form.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} className="h-14 rounded-2xl border border-slate-200 px-3 py-2" /></label>
            </div>
            <label className="grid gap-2 text-sm font-black text-slate-700">Welcome message<textarea value={form.welcome_message} onChange={(e) => update("welcome_message", e.target.value)} rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
            <label className="grid gap-2 text-sm font-black text-slate-700">Employee prompt text<textarea value={form.prompt_text} onChange={(e) => update("prompt_text", e.target.value)} rows={3} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
            <label className="grid gap-2 text-sm font-black text-slate-700">Footer text<textarea value={form.footer_text} onChange={(e) => update("footer_text", e.target.value)} rows={2} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
            {notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{notice}</div>}
            <button disabled={loading} className="btn-primary disabled:opacity-60">{loading ? "Saving..." : "Save Branding"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default PortalBrandingSettings;
