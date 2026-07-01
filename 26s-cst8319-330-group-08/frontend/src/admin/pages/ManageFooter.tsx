import { type FormEvent, useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type FooterSettings = {
  is_enabled: number;
  brand_name: string;
  logo_text: string;
  tagline: string;
  description: string;
  cta_text: string;
  cta_link: string;
  newsletter_title: string;
  newsletter_text: string;
  background_mode: "dark" | "light" | "soft";
  layout_style: "three_column" | "compact" | "newsletter";
  copyright_text: string;
};

type FooterLink = {
  id: number;
  label: string;
  href: string;
  column_key: "left" | "center" | "right" | "bottom";
  display_order: number;
  is_active: number;
  opens_new_tab: number;
};

const defaultSettings: FooterSettings = {
  is_enabled: 1,
  brand_name: "HomeBoost Employee Benefit",
  logo_text: "HB",
  tagline: "Employer home-buying benefit platform.",
  description: "Modern employer portals, advisor communication, resources, quizzes, appointments, and guided support in one place.",
  cta_text: "Request Setup",
  cta_link: "/contact",
  newsletter_title: "Need a custom employer portal?",
  newsletter_text: "Edit this footer from the admin panel with live preview.",
  background_mode: "dark",
  layout_style: "three_column",
  copyright_text: "© 2026 HomeBoost. All rights reserved.",
};

const newLinkDefault = { label: "", href: "", column_key: "left" as FooterLink["column_key"], is_active: 1, opens_new_tab: 0 };
const columns: FooterLink["column_key"][] = ["left", "center", "right", "bottom"];
const columnTitle: Record<FooterLink["column_key"], string> = { left: "Left", center: "Center", right: "Right", bottom: "Bottom" };
const previewTheme: Record<FooterSettings["background_mode"], string> = {
  dark: "border-slate-800 bg-[#050b16] text-white",
  light: "border-slate-200 bg-white text-slate-950",
  soft: "border-blue-100 bg-gradient-to-br from-white via-blue-50 to-pink-50 text-slate-950",
};
const previewMuted: Record<FooterSettings["background_mode"], string> = { dark: "text-slate-400", light: "text-slate-500", soft: "text-slate-500" };

function normalizeSettings(raw: Partial<FooterSettings>): FooterSettings {
  return { ...defaultSettings, ...raw, is_enabled: Number(raw.is_enabled ?? 1) };
}

function FooterPreview({ settings, links }: { settings: FooterSettings; links: FooterLink[] }) {
  const grouped = useMemo(() => {
    return links.filter((link) => Number(link.is_active) === 1).reduce<Record<FooterLink["column_key"], FooterLink[]>>(
      (groups, link) => {
        groups[link.column_key].push(link);
        return groups;
      },
      { left: [], center: [], right: [], bottom: [] }
    );
  }, [links]);

  if (Number(settings.is_enabled) !== 1) return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center font-black text-slate-500">Footer disabled</div>;

  return (
    <div className={`rounded-[2rem] border p-5 shadow-xl ${previewTheme[settings.background_mode]}`}>
      <div className="grid gap-7 lg:grid-cols-[1fr_1.35fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-black text-white">{settings.logo_text || "HB"}</span>
            <div>
              <p className="text-lg font-black">{settings.brand_name}</p>
              <p className={`text-xs font-semibold ${previewMuted[settings.background_mode]}`}>{settings.tagline}</p>
            </div>
          </div>
          <p className={`mt-4 text-sm leading-relaxed ${previewMuted[settings.background_mode]}`}>{settings.description}</p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="font-black">{settings.newsletter_title}</p>
            <p className={`mt-1 text-xs ${previewMuted[settings.background_mode]}`}>{settings.newsletter_text}</p>
            {settings.cta_text && <span className="mt-3 inline-flex rounded-full bg-blue-600 px-4 py-2 text-xs font-black text-white">{settings.cta_text}</span>}
          </div>
        </div>
        <div className={`grid gap-4 ${settings.layout_style === "compact" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {columns.filter((column) => column !== "bottom").map((column) => (
            <div key={column}>
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-blue-400">{columnTitle[column]}</p>
              <div className="space-y-1">{grouped[column].map((link) => <span key={link.id} className={`block rounded-xl px-3 py-2 text-sm font-bold ${previewMuted[settings.background_mode]}`}>{link.label}</span>)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
        <p className={`text-xs font-semibold ${previewMuted[settings.background_mode]}`}>{settings.copyright_text}</p>
        <div className="flex flex-wrap gap-2">{grouped.bottom.map((link) => <span key={link.id} className={`rounded-full px-3 py-1 text-xs font-bold ${previewMuted[settings.background_mode]}`}>{link.label}</span>)}</div>
      </div>
    </div>
  );
}

function ManageFooter() {
  const toast = useToast();
  const token = localStorage.getItem("token");
  const [settings, setSettings] = useState<FooterSettings>(defaultSettings);
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [newLink, setNewLink] = useState(newLinkDefault);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };
  const sortedLinks = [...links].sort((a, b) => columns.indexOf(a.column_key) - columns.indexOf(b.column_key) || Number(a.display_order) - Number(b.display_order));

  const loadFooter = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/footer/admin`, { headers: authHeaders });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message || "Failed to load footer.");
      setSettings(normalizeSettings(data.settings || {}));
      setLinks(Array.isArray(data.links) ? data.links : []);
    } catch {
      toast.error("Failed to load footer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFooter(); }, []);

  const updateSettings = (field: keyof FooterSettings, value: string | number) => setSettings((prev) => ({ ...prev, [field]: value } as FooterSettings));
  const updateLink = (id: number, field: keyof FooterLink, value: string | number) => setLinks((prev) => prev.map((link) => link.id === id ? ({ ...link, [field]: value } as FooterLink) : link));

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/footer/settings`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(settings) });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message || "Failed to save footer.");
      setSettings(normalizeSettings(data.settings || settings));
      setLinks(Array.isArray(data.links) ? data.links : links);
      toast.success("Footer settings saved.");
    } catch {
      toast.error("Failed to save footer.");
    } finally {
      setSaving(false);
    }
  };

  const addLink = async (event: FormEvent) => {
    event.preventDefault();
    if (!newLink.label.trim() || !newLink.href.trim()) return toast.warning("Label and URL are required.");
    try {
      const response = await fetch(`${API_BASE_URL}/footer/links`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(newLink) });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message || "Failed to add item.");
      setNewLink(newLinkDefault);
      await loadFooter();
      toast.success("Footer item added.");
    } catch {
      toast.error("Failed to add item.");
    }
  };

  const saveLink = async (link: FooterLink) => {
    try {
      const response = await fetch(`${API_BASE_URL}/footer/links/${link.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(link) });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message || "Failed to save item.");
      toast.success("Footer item saved.");
    } catch {
      toast.error("Failed to save item.");
    }
  };

  const moveLink = async (id: number, direction: "up" | "down") => {
    try {
      const response = await fetch(`${API_BASE_URL}/footer/links/${id}/move`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ direction }) });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message || "Failed to move item.");
      await loadFooter();
    } catch {
      toast.error("Failed to move item.");
    }
  };

  const removeLink = async (id: number) => {
    if (!confirm("Remove this footer item?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/footer/links/${id}`, { method: "DELETE", headers: authHeaders });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message || "Failed to remove item.");
      setLinks((prev) => prev.filter((link) => link.id !== id));
      toast.success("Footer item removed.");
    } catch {
      toast.error("Failed to remove item.");
    }
  };

  return (
    <AdminLayout title="Footer Builder">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-6">
          <form onSubmit={saveSettings} className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Footer Settings</p><h2 className="mt-1 text-2xl font-black text-slate-950">Brand, style, and CTA</h2><p className="mt-2 text-sm text-slate-500">Change fields on the left and watch the live preview update.</p></div>
              <label className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"><input type="checkbox" checked={Number(settings.is_enabled) === 1} onChange={(event) => updateSettings("is_enabled", event.target.checked ? 1 : 0)} /> Enabled</label>
            </div>
            {loading ? <div className="rounded-2xl bg-slate-50 p-6 text-center font-bold text-slate-500">Loading footer builder...</div> : (
              <div className="grid gap-4 md:grid-cols-2">
                <label><span className="mb-2 block text-sm font-black text-slate-700">Brand name</span><input className="form-field" value={settings.brand_name} onChange={(e) => updateSettings("brand_name", e.target.value)} /></label>
                <label><span className="mb-2 block text-sm font-black text-slate-700">Logo text</span><input className="form-field" value={settings.logo_text} onChange={(e) => updateSettings("logo_text", e.target.value)} /></label>
                <label className="md:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">Tagline</span><input className="form-field" value={settings.tagline} onChange={(e) => updateSettings("tagline", e.target.value)} /></label>
                <label className="md:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">Description</span><textarea className="form-field min-h-[90px]" value={settings.description} onChange={(e) => updateSettings("description", e.target.value)} /></label>
                <label><span className="mb-2 block text-sm font-black text-slate-700">CTA text</span><input className="form-field" value={settings.cta_text} onChange={(e) => updateSettings("cta_text", e.target.value)} /></label>
                <label><span className="mb-2 block text-sm font-black text-slate-700">CTA link</span><input className="form-field" value={settings.cta_link} onChange={(e) => updateSettings("cta_link", e.target.value)} /></label>
                <label><span className="mb-2 block text-sm font-black text-slate-700">Background</span><select className="form-field" value={settings.background_mode} onChange={(e) => updateSettings("background_mode", e.target.value)}><option value="dark">Dark</option><option value="light">Light</option><option value="soft">Soft</option></select></label>
                <label><span className="mb-2 block text-sm font-black text-slate-700">Layout</span><select className="form-field" value={settings.layout_style} onChange={(e) => updateSettings("layout_style", e.target.value)}><option value="three_column">Three column</option><option value="compact">Compact</option><option value="newsletter">Newsletter focus</option></select></label>
                <label className="md:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">CTA title</span><input className="form-field" value={settings.newsletter_title} onChange={(e) => updateSettings("newsletter_title", e.target.value)} /></label>
                <label className="md:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">CTA text details</span><textarea className="form-field min-h-[80px]" value={settings.newsletter_text} onChange={(e) => updateSettings("newsletter_text", e.target.value)} /></label>
                <label className="md:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">Copyright</span><input className="form-field" value={settings.copyright_text} onChange={(e) => updateSettings("copyright_text", e.target.value)} /></label>
              </div>
            )}
            <button disabled={saving || loading} className="mt-5 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : "Save footer settings"}</button>
          </form>

          <form onSubmit={addLink} className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Add Field / Link</p><h2 className="mt-1 text-2xl font-black text-slate-950">Add left, center, right, or bottom item</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input className="form-field" placeholder="Label" value={newLink.label} onChange={(e) => setNewLink((p) => ({ ...p, label: e.target.value }))} />
              <input className="form-field" placeholder="URL, example /contact" value={newLink.href} onChange={(e) => setNewLink((p) => ({ ...p, href: e.target.value }))} />
              <select className="form-field" value={newLink.column_key} onChange={(e) => setNewLink((p) => ({ ...p, column_key: e.target.value as FooterLink["column_key"] }))}>{columns.map((column) => <option key={column} value={column}>{columnTitle[column]}</option>)}</select>
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700"><input type="checkbox" checked={Number(newLink.opens_new_tab) === 1} onChange={(e) => setNewLink((p) => ({ ...p, opens_new_tab: e.target.checked ? 1 : 0 }))} /> Open new tab</label>
            </div>
            <button className="mt-4 rounded-full bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700">Add footer item</button>
          </form>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Live Preview</p><h2 className="mt-1 text-2xl font-black text-slate-950">Footer preview</h2></div><button onClick={loadFooter} type="button" className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Refresh</button></div><FooterPreview settings={settings} links={sortedLinks} /></div>
          <div className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Arrange Items</p><h2 className="mt-1 text-2xl font-black text-slate-950">Edit links + move up/down</h2>
            <div className="mt-5 space-y-3">{sortedLinks.map((link) => <div key={link.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="grid gap-3 md:grid-cols-2"><input className="form-field bg-white" value={link.label} onChange={(e) => updateLink(link.id, "label", e.target.value)} /><input className="form-field bg-white" value={link.href} onChange={(e) => updateLink(link.id, "href", e.target.value)} /><select className="form-field bg-white" value={link.column_key} onChange={(e) => updateLink(link.id, "column_key", e.target.value)}>{columns.map((column) => <option key={column} value={column}>{columnTitle[column]}</option>)}</select><input className="form-field bg-white" type="number" value={link.display_order} onChange={(e) => updateLink(link.id, "display_order", Number(e.target.value))} /></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => moveLink(link.id, "up")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50">↑ Up</button><button type="button" onClick={() => moveLink(link.id, "down")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50">↓ Down</button><label className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200"><input type="checkbox" checked={Number(link.is_active) === 1} onChange={(e) => updateLink(link.id, "is_active", e.target.checked ? 1 : 0)} /> Active</label><label className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200"><input type="checkbox" checked={Number(link.opens_new_tab) === 1} onChange={(e) => updateLink(link.id, "opens_new_tab", e.target.checked ? 1 : 0)} /> New tab</label><button type="button" onClick={() => saveLink(link)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-blue-700">Save</button><button type="button" onClick={() => removeLink(link.id)} className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-100">Remove</button></div></div>)}</div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}

export default ManageFooter;
