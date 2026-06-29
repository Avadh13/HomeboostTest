import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type HBTTeam = { id: number; name: string };

type Partnership = {
  id: number;
  slug: string;
  status: string;
  employer_name: string;
  logo_url?: string | null;
  website?: string | null;
  phone?: string | null;
  contact_email?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  team_id: number;
  hbt_name: string;
};

const defaultForm = {
  company_name: "",
  slug: "",
  logo_url: "",
  website: "",
  phone: "",
  contact_email: "",
  brand_primary_color: "#2563eb",
  brand_secondary_color: "#eff6ff",
  team_id: "",
  status: "active",
};

const presets = [
  { name: "Blue", primary: "#2563eb", secondary: "#eff6ff" },
  { name: "Violet", primary: "#7c3aed", secondary: "#f5f3ff" },
  { name: "Green", primary: "#059669", secondary: "#ecfdf5" },
  { name: "Slate", primary: "#0f172a", secondary: "#f8fafc" },
];

function AdminPartnerships() {
  const toast = useToast();
  const token = localStorage.getItem("token");
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [teams, setTeams] = useState<HBTTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(defaultForm);
  const [blocks, setBlocks] = useState(["Hero Banner", "Home Buying Team", "Resources", "Signup CTA"]);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);

  const getPublicPortalUrl = (slug: string) => `${window.location.origin}/${encodeURIComponent(slug)}`;

  const loadPartnerships = async () => {
    const response = await fetch(`${API_BASE_URL}/admin-partnerships`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.message || "Failed to load partnerships.");
      setPartnerships([]);
      return;
    }
    setPartnerships(Array.isArray(data) ? data : []);
  };

  const loadTeams = async () => {
    const response = await fetch(`${API_BASE_URL}/hbts`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.message || "Failed to load HBT teams.");
      setTeams([]);
      return;
    }
    setTeams(Array.isArray(data) ? data : []);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadPartnerships(), loadTeams()]);
    } catch {
      toast.error("Failed to load partnership data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const generateSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "");
  const selectedTeamName = teams.find((team) => String(team.id) === form.team_id)?.name || "No HBT assigned yet";

  const filteredPartnerships = useMemo(() => {
    const query = search.trim().toLowerCase();
    return partnerships.filter((partnership) => {
      const searchable = [partnership.employer_name, partnership.slug, partnership.hbt_name, partnership.contact_email, partnership.phone].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesTeam = teamFilter === "all" || String(partnership.team_id) === teamFilter;
      const matchesStatus = statusFilter === "all" || partnership.status === statusFilter;
      return matchesSearch && matchesTeam && matchesStatus;
    });
  }, [partnerships, search, statusFilter, teamFilter]);

  const startEdit = (partnership: Partnership) => {
    setEditingId(partnership.id);
    setForm({
      company_name: partnership.employer_name || "",
      slug: partnership.slug || "",
      logo_url: partnership.logo_url || "",
      website: partnership.website || "",
      phone: partnership.phone || "",
      contact_email: partnership.contact_email || "",
      brand_primary_color: partnership.brand_primary_color || "#2563eb",
      brand_secondary_color: partnership.brand_secondary_color || "#eff6ff",
      team_id: String(partnership.team_id || ""),
      status: partnership.status || "active",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleDropBlock = (target: string) => {
    if (!draggedBlock || draggedBlock === target) return;
    const updated = [...blocks];
    const fromIndex = updated.indexOf(draggedBlock);
    const toIndex = updated.indexOf(target);
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setBlocks(updated);
    setDraggedBlock(null);
    toast.info("Portal plan reordered locally. CMS display order is saved from Sections/Cards pages.");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.company_name || !form.slug || !form.team_id) {
      toast.warning("Company name, slug, and HBT team are required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(editingId ? `${API_BASE_URL}/admin-partnerships/${editingId}` : `${API_BASE_URL}/admin-partnerships`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, team_id: Number(form.team_id) }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to save partnership.");
        return;
      }
      toast.success(editingId ? "Branding updated." : `Partnership created. Public URL: /${form.slug}`);
      resetForm();
      await loadPartnerships();
    } catch {
      toast.error("Failed to save partnership.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Employer Partnerships">
      <div className="space-y-5">
        <section className="theme-panel">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Partnership Builder</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Employer Portal Setup</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">Create company-branded portals and control logo/colors for the public employer page.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-3xl bg-white/10 p-3 backdrop-blur">
              <div><p className="text-2xl font-black">{partnerships.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Total</p></div>
              <div><p className="text-2xl font-black">{partnerships.filter((item) => item.status === "active").length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Active</p></div>
              <div><p className="text-2xl font-black">{partnerships.filter((item) => item.status !== "active").length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Inactive</p></div>
              <div><p className="text-2xl font-black">{new Set(partnerships.map((item) => item.team_id).filter(Boolean)).size}</p><p className="text-[11px] font-bold uppercase text-violet-100">HBTs</p></div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <section className="premium-card">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{editingId ? "Edit branding" : "Create partnership"}</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{editingId ? "Update Employer Branding" : "Add Employer Company"}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">Logo and theme colors appear on the public employer portal.</p>
              </div>
              {editingId && <button type="button" onClick={resetForm} className="btn-secondary">New</button>}
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Company Name</span><input className="form-field" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value, slug: editingId ? form.slug : generateSlug(e.target.value) })} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">URL Slug</span><input className="form-field" value={form.slug} disabled={Boolean(editingId)} onChange={(e) => setForm({ ...form, slug: generateSlug(e.target.value) })} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Assign HBT Team</span><select className="form-field" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}><option value="">Assign HBT Team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
              <label className="block md:col-span-2"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Logo URL</span><input className="form-field" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></label>

              <div className="rounded-3xl border border-violet-100 bg-violet-50/70 p-4 md:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Theme colors</p><p className="mt-1 text-sm font-semibold text-slate-600">Pick a preset or custom colors.</p></div><div className="flex gap-2"><span className="h-8 w-8 rounded-full border border-white shadow" style={{ backgroundColor: form.brand_primary_color }} /><span className="h-8 w-8 rounded-full border border-slate-200 shadow" style={{ backgroundColor: form.brand_secondary_color }} /></div></div>
                <div className="mb-4 grid gap-2 sm:grid-cols-4">{presets.map((preset) => <button type="button" key={preset.name} onClick={() => setForm({ ...form, brand_primary_color: preset.primary, brand_secondary_color: preset.secondary })} className="rounded-2xl border border-white bg-white p-3 text-left shadow-sm hover:border-violet-300"><span className="mb-2 flex gap-1"><span className="h-5 w-5 rounded-full" style={{ backgroundColor: preset.primary }} /><span className="h-5 w-5 rounded-full border" style={{ backgroundColor: preset.secondary }} /></span><span className="text-xs font-black text-slate-700">{preset.name}</span></button>)}</div>
                <div className="grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Primary Color</span><input className="form-field" type="color" value={form.brand_primary_color} onChange={(e) => setForm({ ...form, brand_primary_color: e.target.value })} /></label><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Background Color</span><input className="form-field" type="color" value={form.brand_secondary_color} onChange={(e) => setForm({ ...form, brand_secondary_color: e.target.value })} /></label></div>
              </div>

              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Website URL</span><input className="form-field" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Contact Phone</span><input className="form-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Contact Email</span><input className="form-field" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              <button disabled={saving} className="btn-primary md:col-span-2 disabled:bg-slate-400">{saving ? "Saving..." : editingId ? "Update Branding" : "Create Partnership"}</button>
            </form>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] text-white shadow-xl" style={{ backgroundColor: form.brand_primary_color }}>
            <div className="p-6"><p className="text-xs font-black uppercase tracking-[0.22em] text-white/75">Live Brand Preview</p><h3 className="mt-3 text-3xl font-black">{form.company_name || "Company Name"}</h3><p className="mt-2 text-white/80">/{form.slug || "companyslug"}</p><p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-white/90">Assigned HBT: <strong>{selectedTeamName}</strong></p></div>
            <div className="p-5 text-slate-950" style={{ backgroundColor: form.brand_secondary_color }}><div className="rounded-3xl bg-white/80 p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-lg font-black text-white" style={{ backgroundColor: form.brand_primary_color }}>{form.logo_url ? <img src={form.logo_url} alt="Company logo" className="h-full w-full object-cover" /> : (form.company_name || "C").charAt(0)}</div><div><p className="text-xs font-black uppercase tracking-wide" style={{ color: form.brand_primary_color }}>Employee Benefit Portal</p><h4 className="text-xl font-black">Home-buying guidance for employees</h4></div></div><p className="text-sm leading-relaxed text-slate-600">Employees will access resources, quizzes, events, messages, and booking support from this branded portal.</p><span className="mt-5 inline-flex rounded-full px-5 py-2 text-sm font-black text-white" style={{ backgroundColor: form.brand_primary_color }}>Signup CTA</span></div></div>
          </section>
        </div>

        <section className="premium-card">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="eyebrow">Portal plan</p><h2 className="mt-1 text-2xl font-black text-slate-950">Drag-and-drop portal section plan</h2><p className="mt-1 text-sm text-slate-600">Planning only: real CMS display order is saved in Admin → Sections and Admin → Cards.</p></div><span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">Planning board</span></div>
          <div className="grid gap-4 md:grid-cols-2">{blocks.map((block, index) => <div key={block} draggable onDragStart={() => setDraggedBlock(block)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDropBlock(block)} className={`cursor-grab rounded-2xl border p-5 transition hover:-translate-y-1 hover:shadow-lg ${draggedBlock === block ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-slate-50"}`}><p className="text-xs font-black uppercase tracking-wide text-slate-500">Block {index + 1}</p><h3 className="mt-2 text-lg font-black text-slate-950">{block}</h3></div>)}</div>
        </section>

        <section className="premium-card overflow-hidden p-0">
          <div className="border-b border-slate-100 p-4"><div className="mb-4"><p className="eyebrow">Current partnerships</p><h2 className="mt-1 text-2xl font-black text-slate-950">Employer Partnership Directory</h2></div><div className="grid gap-3 md:grid-cols-[1fr_220px_180px] md:items-center"><input className="form-field" placeholder="Search employer, slug, HBT, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className="form-field" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}><option value="all">All HBT teams</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div>
          {loading ? <div className="p-8 text-center font-bold text-slate-500">Loading partnerships...</div> : filteredPartnerships.length === 0 ? <div className="p-8 text-center text-slate-500">No partnerships found.</div> : <div className="grid gap-4 p-4 xl:grid-cols-2">{filteredPartnerships.map((partnership) => <article key={partnership.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-black text-white" style={{ backgroundColor: partnership.brand_primary_color || "#2563eb" }}>{partnership.logo_url ? <img src={partnership.logo_url} alt={partnership.employer_name} className="h-full w-full object-cover" /> : partnership.employer_name?.charAt(0) || "E"}</div><div><h3 className="text-xl font-black text-slate-950">{partnership.employer_name}</h3><p className="text-sm font-bold text-violet-600">/{partnership.slug}</p><p className="mt-2 text-sm text-slate-600">HBT Team: <strong>{partnership.hbt_name}</strong></p>{partnership.contact_email && <p className="text-sm text-slate-600">Email: {partnership.contact_email}</p>}<div className="mt-2 flex gap-2"><span className="h-5 w-5 rounded-full border" style={{ backgroundColor: partnership.brand_primary_color || "#2563eb" }} /><span className="h-5 w-5 rounded-full border" style={{ backgroundColor: partnership.brand_secondary_color || "#eff6ff" }} /></div></div></div><span className={`rounded-full px-3 py-1 text-xs font-black ${partnership.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{partnership.status}</span></div><div className="mt-5 flex flex-wrap gap-2"><a href={getPublicPortalUrl(partnership.slug)} target="_blank" rel="noopener noreferrer" className="btn-primary">View Page</a>{partnership.website && <a href={partnership.website} target="_blank" rel="noreferrer" className="btn-secondary">Website</a>}<button onClick={() => startEdit(partnership)} className="btn-dark">Edit Branding</button></div></article>)}</div>}
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminPartnerships;
