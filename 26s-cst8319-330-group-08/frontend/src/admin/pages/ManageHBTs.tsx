import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type HBT = {
  id: number;
  name: string;
  description: string;
  logo_url: string;
  email: string;
  phone: string;
  website: string;
  is_active: number;
  admin_name?: string | null;
  admin_email?: string | null;
};

const initials = (value?: string) =>
  String(value || "HB").split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "HB";

function ManageHBTs() {
  const toast = useToast();
  const [hbts, setHbts] = useState<HBT[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isActive, setIsActive] = useState(1);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const loadHBTs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/hbts`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) { toast.error(data.message || "Failed to load HBT teams."); setHbts([]); return; }
      setHbts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load HBT teams:", error);
      toast.error("Failed to load HBT teams.");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadHBTs(); }, []);

  const filteredHbts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return hbts.filter((hbt) => {
      const matchesSearch = !query || [hbt.name, hbt.description, hbt.email, hbt.phone, hbt.admin_name, hbt.admin_email].filter(Boolean).join(" ").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || String(Number(hbt.is_active)) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [hbts, search, statusFilter]);

  const activeCount = hbts.filter((hbt) => Number(hbt.is_active) === 1).length;
  const disabledCount = hbts.filter((hbt) => Number(hbt.is_active) === 0).length;
  const adminLoginCount = hbts.filter((hbt) => hbt.admin_email).length;

  const resetForm = () => {
    setEditingId(null); setTeamName(""); setDescription(""); setLogoUrl(""); setContactEmail(""); setContactPhone(""); setWebsiteUrl(""); setIsActive(1); setAdminName(""); setAdminEmail(""); setAdminPassword("");
  };
  const openCreateDrawer = () => { resetForm(); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); resetForm(); };
  const startEdit = (hbt: HBT) => {
    setEditingId(hbt.id); setTeamName(hbt.name || ""); setDescription(hbt.description || ""); setLogoUrl(hbt.logo_url || ""); setContactEmail(hbt.email || ""); setContactPhone(hbt.phone || ""); setWebsiteUrl(hbt.website || ""); setIsActive(hbt.is_active ? 1 : 0); setAdminName(hbt.admin_name || ""); setAdminEmail(hbt.admin_email || ""); setAdminPassword(""); setDrawerOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!teamName.trim()) { toast.warning("Team name is required."); return; }
    if (!editingId && (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim())) { toast.warning("HBT Admin name, email, and password are required when creating a new team."); return; }

    try {
      const response = await fetch(editingId ? `${API_BASE_URL}/hbts/${editingId}` : `${API_BASE_URL}/hbts`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: teamName, description, logo_url: logoUrl, email: contactEmail, phone: contactPhone, website: websiteUrl, is_active: isActive, admin_name: adminName, admin_email: adminEmail, admin_password: adminPassword }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.message || "Failed to save HBT."); return; }
      toast.success(editingId ? "HBT updated successfully." : "HBT created successfully.");
      closeDrawer();
      loadHBTs();
    } catch (error) {
      console.error("Save HBT error:", error);
      toast.error("Failed to save HBT.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Disable this Home Buying Team and its HBT admin login?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/hbts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) { toast.error(data.message || "Failed to disable HBT."); return; }
      toast.success("HBT disabled successfully.");
      loadHBTs();
    } catch { toast.error("Failed to disable HBT."); }
  };

  return (
    <AdminLayout title="Manage Home Buying Teams">
      <div className="space-y-5">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="eyebrow">HBT Administration</p><h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Home Buying Teams</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">Manage the actual Home Buying Team profiles, linked admin accounts, contact information, and platform status.</p></div><button type="button" onClick={openCreateDrawer} className="btn-primary">Add HBT Team</button></div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">{[["Total Teams", hbts.length], ["Active", activeCount], ["Disabled", disabledCount], ["Admin Logins", adminLoginCount]].map(([label, value]) => <div key={String(label)} className="metric-card"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><h2 className="mt-2 text-3xl font-black text-blue-700">{value}</h2></div>)}</section>

        <section className="premium-card p-4"><div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-center"><input className="form-field" placeholder="Search team, admin, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All status</option><option value="1">Active</option><option value="0">Disabled</option></select><button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add HBT</button></div></section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? <div className="premium-card p-8 text-center font-bold text-slate-500 md:col-span-2 xl:col-span-3">Loading Home Buying Teams...</div> : filteredHbts.length === 0 ? <div className="premium-card p-8 text-center text-slate-500 md:col-span-2 xl:col-span-3">No Home Buying Teams found.</div> : filteredHbts.map((hbt) => (
            <article key={hbt.id} className="premium-card overflow-hidden p-0"><div className="flex h-40 items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-800">{hbt.logo_url ? <img src={hbt.logo_url} alt={hbt.name} className="h-full w-full object-cover" /> : <span className="text-4xl font-black text-white">{initials(hbt.name)}</span>}</div><div className="p-5"><div className="mb-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${hbt.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{hbt.is_active ? "Active" : "Disabled"}</span>{hbt.admin_email && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">Admin login</span>}</div><h3 className="text-xl font-black text-slate-950">{hbt.name}</h3><p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{hbt.description || "No team description has been entered."}</p><div className="mt-4 space-y-1 text-sm text-slate-500"><p><strong>Team Email:</strong> {hbt.email || "Not set"}</p><p><strong>Phone:</strong> {hbt.phone || "Not set"}</p><p><strong>Admin:</strong> {hbt.admin_name || "Not set"} · {hbt.admin_email || "No login assigned"}</p></div><div className="mt-5 flex flex-wrap gap-2">{hbt.website && <a href={hbt.website} target="_blank" rel="noreferrer" className="btn-secondary">Website</a>}<button type="button" onClick={() => startEdit(hbt)} className="btn-primary">Edit</button><button type="button" onClick={() => handleDelete(hbt.id)} className="btn-danger">Disable</button></div></div></article>
          ))}
        </section>
      </div>

      {drawerOpen && <div className="fixed inset-0 z-[80]"><button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" /><aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col bg-slate-50 shadow-2xl md:w-[86vw] xl:w-[980px]"><div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">HBT editor</p><h2 className="text-2xl font-black">{editingId ? "Edit HBT Team" : "Add HBT Team + Admin Login"}</h2></div><button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">Close</button></div><div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.82fr]"><form onSubmit={handleSubmit} className="space-y-4 p-5"><label className="block"><span className="mb-1 block text-xs font-black uppercase text-slate-500">Team Name</span><input className="form-field" value={teamName} onChange={(e) => setTeamName(e.target.value)} /></label><label className="block"><span className="mb-1 block text-xs font-black uppercase text-slate-500">Description</span><textarea className="form-field min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} /></label><label className="block"><span className="mb-1 block text-xs font-black uppercase text-slate-500">Logo URL</span><input className="form-field" placeholder="Approved logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} /></label><div className="grid gap-4 md:grid-cols-2"><input className="form-field" placeholder="Team contact email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /><input className="form-field" placeholder="Team contact phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /><input className="form-field" placeholder="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} /><select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}><option value={1}>Active</option><option value={0}>Disabled</option></select></div>{!editingId ? <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="font-black text-blue-900">HBT Admin Login</p><div className="mt-3 space-y-3"><input className="form-field" placeholder="HBT Admin Full Name" value={adminName} onChange={(e) => setAdminName(e.target.value)} /><input className="form-field" placeholder="HBT Admin Email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} /><input className="form-field" placeholder="HBT Admin Password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} /></div></div> : <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-black text-slate-900">Linked HBT Admin</p><p className="text-sm text-slate-600">{adminName || "No name"} · {adminEmail || "No email"}</p></div>}<div className="flex gap-3 border-t border-slate-200 pt-4"><button className="btn-primary">{editingId ? "Update HBT" : "Add HBT + Create Login"}</button><button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button></div></form><section className="border-l border-slate-200 bg-white p-5"><p className="eyebrow">Current preview</p><div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl"><div className="flex h-56 items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-800">{logoUrl ? <img src={logoUrl} alt={teamName || "HBT logo"} className="h-full w-full object-cover" /> : <span className="text-5xl font-black text-white">{initials(teamName)}</span>}</div><div className="p-5"><h3 className="text-2xl font-black text-slate-950">{teamName || "Team name not entered"}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{description || "No description entered."}</p><div className="mt-4 space-y-1 text-sm text-slate-500"><p>{contactEmail || "Contact email not set"}</p><p>{contactPhone || "Phone not set"}</p><p>Admin: {adminName || "Not entered"}</p></div></div></div></section></div></aside></div>}
    </AdminLayout>
  );
}

export default ManageHBTs;
