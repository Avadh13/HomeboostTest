import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import ChatWidget from "../../components/ChatWidget";
import { useToast } from "../../components/ToastProvider";

type HBTTeam = {
  id: number;
  name: string;
};

type Partnership = {
  id: number;
  slug: string;
  status: string;
  employer_id: number;
  employer_name: string;
  logo_url?: string | null;
  website?: string | null;
  phone?: string | null;
  contact_email?: string | null;
  team_id: number;
  hbt_name: string;
};

type PortalBlock = {
  id: string;
  title: string;
  description: string;
};

const initialBlocks: PortalBlock[] = [
  { id: "hero", title: "Hero Banner", description: "Employer name, benefit headline, and call-to-action buttons." },
  { id: "hbt-team", title: "Home Buying Team", description: "Assigned HBT team contact details and support introduction." },
  { id: "resources", title: "Employee Resources", description: "Guides, mortgage education, event links, and home buying materials." },
  { id: "signup", title: "Employee Signup", description: "Enrollment call-to-action connected to the company partnership slug." },
];

function AdminPartnerships() {
  const toast = useToast();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [teams, setTeams] = useState<HBTTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<PortalBlock[]>(initialBlocks);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    company_name: "",
    slug: "",
    logo_url: "",
    website: "",
    phone: "",
    contact_email: "",
    team_id: "",
    status: "active",
  });

  const token = localStorage.getItem("token");

  const getPublicPortalUrl = (slug: string) => `${window.location.origin}/${encodeURIComponent(slug)}`;

  const loadPartnerships = async () => {
    const response = await fetch(`${API_BASE_URL}/admin-partnerships`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message || "Failed to load partnerships.");
      setPartnerships([]);
      return;
    }

    setPartnerships(Array.isArray(data) ? data : []);
  };

  const loadTeams = async () => {
    const response = await fetch(`${API_BASE_URL}/hbts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

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
    } catch (error) {
      console.error("Load partnership data error:", error);
      toast.error("Failed to load partnership data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const generateSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "");

  const selectedTeamName = useMemo(() => {
    return teams.find((team) => String(team.id) === form.team_id)?.name || "No HBT assigned yet";
  }, [form.team_id, teams]);

  const filteredPartnerships = useMemo(() => {
    const query = search.trim().toLowerCase();

    return partnerships.filter((partnership) => {
      const matchesSearch =
        !query ||
        partnership.employer_name?.toLowerCase().includes(query) ||
        partnership.slug?.toLowerCase().includes(query) ||
        partnership.hbt_name?.toLowerCase().includes(query) ||
        partnership.contact_email?.toLowerCase().includes(query) ||
        partnership.phone?.toLowerCase().includes(query);
      const matchesTeam = teamFilter === "all" || String(partnership.team_id) === teamFilter;
      const matchesStatus = statusFilter === "all" || partnership.status === statusFilter;
      return matchesSearch && matchesTeam && matchesStatus;
    });
  }, [partnerships, search, statusFilter, teamFilter]);

  const activeCount = partnerships.filter((item) => item.status === "active").length;
  const inactiveCount = partnerships.filter((item) => item.status !== "active").length;
  const assignedTeamCount = new Set(partnerships.map((item) => item.team_id).filter(Boolean)).size;

  const handleCompanyNameChange = (value: string) => {
    setForm({ ...form, company_name: value, slug: generateSlug(value) });
  };

  const handleDrop = (targetId: string) => {
    if (!draggedBlockId || draggedBlockId === targetId) return;

    const draggedIndex = blocks.findIndex((block) => block.id === draggedBlockId);
    const targetIndex = blocks.findIndex((block) => block.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const updated = [...blocks];
    const [draggedBlock] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedBlock);
    setBlocks(updated);
    setDraggedBlockId(null);
  };

  const resetForm = () => {
    setForm({
      company_name: "",
      slug: "",
      logo_url: "",
      website: "",
      phone: "",
      contact_email: "",
      team_id: "",
      status: "active",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.company_name || !form.slug || !form.team_id) {
      toast.warning("Company name, slug, and HBT team are required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/admin-partnerships`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, team_id: Number(form.team_id) }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to create partnership.");
        return;
      }

      toast.success(`Partnership created. Public URL: /${form.slug}`);
      resetForm();
      await loadPartnerships();
    } catch (error) {
      console.error("Create partnership error:", error);
      toast.error("Failed to create partnership.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Are you sure you want to delete this employer partnership? This removes the company portal connection.");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin-partnerships/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to delete partnership.");
        return;
      }

      toast.success("Partnership deleted successfully.");
      await loadPartnerships();
    } catch (error) {
      console.error("Delete partnership error:", error);
      toast.error("Failed to delete partnership.");
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
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">
                Create company-branded portals, assign each employer to the correct HBT team, and preview the employee landing page before launch.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-3xl bg-white/10 p-3 backdrop-blur">
              <div><p className="text-2xl font-black">{partnerships.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Total</p></div>
              <div><p className="text-2xl font-black">{activeCount}</p><p className="text-[11px] font-bold uppercase text-violet-100">Active</p></div>
              <div><p className="text-2xl font-black">{inactiveCount}</p><p className="text-[11px] font-bold uppercase text-violet-100">Inactive</p></div>
              <div><p className="text-2xl font-black">{assignedTeamCount}</p><p className="text-[11px] font-bold uppercase text-violet-100">HBTs</p></div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <section className="premium-card">
            <div className="mb-5">
              <p className="eyebrow">Create partnership</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Add Employer Company</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">The slug becomes the public portal path, for example <strong>/companyname</strong>.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Company Name</span><input className="form-field" placeholder="Company Name" value={form.company_name} onChange={(e) => handleCompanyNameChange(e.target.value)} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">URL Slug</span><input className="form-field" placeholder="companyslug" value={form.slug} onChange={(e) => setForm({ ...form, slug: generateSlug(e.target.value) })} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Assign HBT Team</span><select className="form-field" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}><option value="">Assign HBT Team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
              <label className="block md:col-span-2"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Logo URL</span><input className="form-field" placeholder="https://..." value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Website URL</span><input className="form-field" placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Contact Phone</span><input className="form-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Contact Email</span><input className="form-field" placeholder="contact@example.com" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              <button disabled={saving} className="btn-primary md:col-span-2 disabled:bg-slate-400">{saving ? "Creating..." : "Create Partnership"}</button>
            </form>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] bg-slate-950 text-white shadow-xl">
            <div className="p-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Live Preview</p>
              <h3 className="mt-3 text-3xl font-black">{form.company_name || "Company Name"}</h3>
              <p className="mt-2 text-violet-100">/{form.slug || "companyslug"}</p>
              <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-slate-200">Assigned HBT: <strong>{selectedTeamName}</strong></p>
            </div>
            <div className="bg-white p-5 text-slate-950">
              <div className="rounded-3xl bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-lg font-black text-white">
                    {form.logo_url ? <img src={form.logo_url} alt="Company logo" className="h-full w-full object-cover" /> : (form.company_name || "C").charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-violet-600">Employee Benefit Portal</p>
                    <h4 className="text-xl font-black">Home-buying guidance for employees</h4>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">Employees will access resources, quizzes, events, messages, and booking support from this branded portal.</p>
              </div>
            </div>
          </section>
        </div>

        <section className="premium-card">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">Portal plan</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Drag-and-drop portal section plan</h2>
              <p className="mt-1 text-sm text-slate-600">Planning only: use this to arrange the ideal employer portal flow before editing CMS sections.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">WordPress-style planning</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {blocks.map((block, index) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => setDraggedBlockId(block.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(block.id)}
                className={`cursor-grab rounded-2xl border p-5 transition hover:-translate-y-1 hover:shadow-lg ${draggedBlockId === block.id ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-slate-50"}`}
              >
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Block {index + 1}</p>
                <h3 className="mt-2 text-lg font-black text-slate-950">{block.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{block.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="premium-card overflow-hidden p-0">
          <div className="border-b border-slate-100 p-4">
            <div className="mb-4">
              <p className="eyebrow">Current partnerships</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Employer Partnership Directory</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_220px_180px] md:items-center">
              <input className="form-field" placeholder="Search employer, slug, HBT, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="form-field" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
                <option value="all">All HBT teams</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center font-bold text-slate-500">Loading partnerships...</div>
          ) : filteredPartnerships.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No partnerships found.</div>
          ) : (
            <div className="grid gap-4 p-4 xl:grid-cols-2">
              {filteredPartnerships.map((partnership) => (
                <article key={partnership.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-lg font-black text-white">
                        {partnership.logo_url ? <img src={partnership.logo_url} alt={partnership.employer_name} className="h-full w-full object-cover" /> : partnership.employer_name?.charAt(0) || "E"}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-950">{partnership.employer_name}</h3>
                        <p className="text-sm font-bold text-violet-600">/{partnership.slug}</p>
                        <p className="mt-2 text-sm text-slate-600">HBT Team: <strong>{partnership.hbt_name}</strong></p>
                        {partnership.contact_email && <p className="text-sm text-slate-600">Email: {partnership.contact_email}</p>}
                        {partnership.phone && <p className="text-sm text-slate-600">Phone: {partnership.phone}</p>}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${partnership.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{partnership.status}</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <a href={getPublicPortalUrl(partnership.slug)} target="_blank" rel="noopener noreferrer" className="btn-primary">View Page</a>
                    {partnership.website && <a href={partnership.website} target="_blank" rel="noreferrer" className="btn-secondary">Website</a>}
                    <button onClick={() => handleDelete(partnership.id)} className="btn-danger">Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <ChatWidget />
    </AdminLayout>
  );
}

export default AdminPartnerships;
