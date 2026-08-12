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

const fallbackLogo = "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80";

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
      const response = await fetch(`${API_BASE_URL}/hbts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to load HBT teams.");
        setHbts([]);
        return;
      }

      setHbts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load HBT teams:", error);
      toast.error("Failed to load HBT teams.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHBTs();
  }, []);

  const filteredHbts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return hbts.filter((hbt) => {
      const matchesSearch =
        !query ||
        hbt.name?.toLowerCase().includes(query) ||
        hbt.description?.toLowerCase().includes(query) ||
        hbt.email?.toLowerCase().includes(query) ||
        hbt.phone?.toLowerCase().includes(query) ||
        hbt.admin_name?.toLowerCase().includes(query) ||
        hbt.admin_email?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || String(Number(hbt.is_active)) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [hbts, search, statusFilter]);

  const activeCount = hbts.filter((hbt) => Number(hbt.is_active) === 1).length;
  const disabledCount = hbts.filter((hbt) => Number(hbt.is_active) === 0).length;
  const adminLoginCount = hbts.filter((hbt) => hbt.admin_email).length;

  const resetForm = () => {
    setEditingId(null);
    setTeamName("");
    setDescription("");
    setLogoUrl("");
    setContactEmail("");
    setContactPhone("");
    setWebsiteUrl("");
    setIsActive(1);
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
  };

  const openCreateDrawer = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    resetForm();
  };

  const startEdit = (hbt: HBT) => {
    setEditingId(hbt.id);
    setTeamName(hbt.name || "");
    setDescription(hbt.description || "");
    setLogoUrl(hbt.logo_url || "");
    setContactEmail(hbt.email || "");
    setContactPhone(hbt.phone || "");
    setWebsiteUrl(hbt.website || "");
    setIsActive(hbt.is_active ? 1 : 0);
    setAdminName(hbt.admin_name || "");
    setAdminEmail(hbt.admin_email || "");
    setAdminPassword("");
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim()) {
      toast.warning("Team name is required.");
      return;
    }

    if (!editingId && (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim())) {
      toast.warning("HBT Admin name, email, and password are required when creating a new team.");
      return;
    }

    const url = editingId ? `${API_BASE_URL}/hbts/${editingId}` : `${API_BASE_URL}/hbts`;
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: teamName,
          description,
          logo_url: logoUrl,
          email: contactEmail,
          phone: contactPhone,
          website: websiteUrl,
          is_active: isActive,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to save HBT.");
        return;
      }

      toast.success(editingId ? "HBT updated successfully." : `HBT created successfully. Login Email: ${data.admin_email || adminEmail}`);
      closeDrawer();
      loadHBTs();
    } catch (error) {
      console.error("Save HBT error:", error);
      toast.error("Failed to save HBT.");
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Disable this Home Buying Team and its HBT admin login?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/hbts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to disable HBT.");
        return;
      }

      toast.success("HBT disabled successfully.");
      loadHBTs();
    } catch (error) {
      console.error("Disable HBT error:", error);
      toast.error("Failed to disable HBT.");
    }
  };

  return (
    <AdminLayout title="Manage Home Buying Teams">
      <div className="space-y-5">
        <section className="theme-panel">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">HBT Administration</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Home Buying Teams</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">
                Create HBT team profiles, assign admin logins, and manage team status before assigning teams to employer partnerships.
              </p>
            </div>
            <button type="button" onClick={openCreateDrawer} className="rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">
              Add HBT Team
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Total Teams", hbts.length, "text-violet-700", "bg-violet-50"],
            ["Active", activeCount, "text-emerald-700", "bg-emerald-50"],
            ["Disabled", disabledCount, "text-red-700", "bg-red-50"],
            ["Admin Logins", adminLoginCount, "text-blue-700", "bg-blue-50"],
          ].map(([label, value, textTone, bgTone]) => (
            <div key={label} className="metric-card">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <h2 className={`mt-2 rounded-2xl px-3 py-2 text-3xl font-black ${textTone} ${bgTone}`}>{value}</h2>
            </div>
          ))}
        </section>

        <section className="premium-card p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-center">
            <input className="form-field" placeholder="Search team, admin, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All status</option>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </select>
            <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add HBT</button>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-500">Showing {filteredHbts.length} of {hbts.length} teams</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="premium-card p-8 text-center font-bold text-slate-500 md:col-span-2 xl:col-span-3">Loading Home Buying Teams...</div>
          ) : filteredHbts.length === 0 ? (
            <div className="premium-card p-8 text-center text-slate-500 md:col-span-2 xl:col-span-3">No Home Buying Teams found.</div>
          ) : (
            filteredHbts.map((hbt) => (
              <article key={hbt.id} className="premium-card overflow-hidden p-0">
                <div className="h-40 bg-slate-100">
                  {hbt.logo_url ? <img src={hbt.logo_url} alt={hbt.name} className="h-full w-full object-cover" /> : <img src={fallbackLogo} alt={hbt.name} className="h-full w-full object-cover" />}
                </div>
                <div className="p-5">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${hbt.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{hbt.is_active ? "Active" : "Disabled"}</span>
                    {hbt.admin_email && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">Admin login</span>}
                  </div>
                  <h3 className="text-xl font-black text-slate-950">{hbt.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{hbt.description || "No description"}</p>
                  <div className="mt-4 space-y-1 text-sm text-slate-500">
                    <p><strong>Team Email:</strong> {hbt.email || "N/A"}</p>
                    <p><strong>Phone:</strong> {hbt.phone || "N/A"}</p>
                    <p><strong>Admin:</strong> {hbt.admin_name || "N/A"} · {hbt.admin_email || "No login assigned"}</p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {hbt.website && <a href={hbt.website} target="_blank" rel="noreferrer" className="btn-secondary">Website</a>}
                    <button type="button" onClick={() => startEdit(hbt)} className="btn-primary">Edit</button>
                    <button type="button" onClick={() => handleDelete(hbt.id)} className="btn-danger">Disable</button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[86vw] xl:w-[980px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">HBT drawer editor</p>
                <h2 className="text-2xl font-black">{editingId ? "Edit HBT Team" : "Add HBT Team + Admin Login"}</h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.82fr]">
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="font-black text-blue-900">Team Information</p>
                  <p className="text-sm text-blue-700">Create the Home Buying Team profile assigned to employer partnerships.</p>
                </div>

                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Team Name</span><input className="form-field" placeholder="Team Name" value={teamName} onChange={(e) => setTeamName(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Description</span><textarea className="form-field min-h-28" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Logo URL</span><input className="form-field" placeholder="https://..." value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} /></label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Team Contact Email</span><input className="form-field" placeholder="team@example.com" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Team Contact Phone</span><input className="form-field" placeholder="Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Website URL</span><input className="form-field" placeholder="https://..." value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}><option value={1}>Active</option><option value={0}>Disabled</option></select></label>
                </div>

                {!editingId ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="font-black text-emerald-900">HBT Admin Login</p>
                    <p className="mb-4 text-sm text-emerald-700">This login will be created automatically and linked to this HBT team.</p>
                    <div className="space-y-3">
                      <input className="form-field" placeholder="HBT Admin Full Name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                      <input className="form-field" placeholder="HBT Admin Email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                      <input className="form-field" placeholder="HBT Admin Password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="font-black text-amber-900">Linked HBT Admin</p>
                    <p className="text-sm text-amber-700">Admin Name: {adminName || "N/A"}</p>
                    <p className="text-sm text-amber-700">Admin Email: {adminEmail || "N/A"}</p>
                    <p className="mt-2 text-xs text-amber-700">Password changes are not handled here yet.</p>
                  </div>
                )}

                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <button className="btn-primary">{editingId ? "Update HBT" : "Add HBT + Create Login"}</button>
                  <button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button>
                </div>
              </form>

              <section className="border-l border-slate-200 bg-white p-5">
                <p className="eyebrow">Live preview</p>
                <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
                  <div className="h-56 bg-slate-100"><img src={logoUrl || fallbackLogo} alt="HBT preview" className="h-full w-full object-cover" /></div>
                  <div className="p-5">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{isActive ? "Active" : "Disabled"}</span>
                    <h3 className="mt-3 text-2xl font-black text-slate-950">{teamName || "Home Buying Team"}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{description || "Team description preview will appear here."}</p>
                    <div className="mt-4 space-y-1 text-sm text-slate-500">
                      <p>{contactEmail || "team@example.com"}</p>
                      <p>{contactPhone || "Phone number"}</p>
                      <p>Admin: {adminName || "Admin name"}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageHBTs;
