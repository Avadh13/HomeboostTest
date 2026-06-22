import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import ChatWidget from "../../components/ChatWidget";

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

function AdminPartnerships() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [teams, setTeams] = useState<HBTTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<PortalBlock[]>([
    {
      id: "hero",
      title: "Hero Banner",
      description:
        "Employer name, benefit headline, and call-to-action buttons.",
    },
    {
      id: "hbt-team",
      title: "Home Buying Team",
      description:
        "Assigned HBT team contact details and support introduction.",
    },
    {
      id: "resources",
      title: "Employee Resources",
      description:
        "Guides, mortgage education, event links, and home buying materials.",
    },
    {
      id: "signup",
      title: "Employee Signup",
      description:
        "Enrollment call-to-action connected to the company partnership slug.",
    },
  ]);

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

  const getPublicPortalUrl = (slug: string) => {
    return `${window.location.origin}/${encodeURIComponent(slug)}`;
  };

  const loadPartnerships = async () => {
    const response = await fetch(`${API_BASE_URL}/admin-partnerships`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to load partnerships");
      setPartnerships([]);
      return;
    }

    setPartnerships(Array.isArray(data) ? data : []);
  };

  const loadTeams = async () => {
    const response = await fetch(`${API_BASE_URL}/hbts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to load HBT teams");
      setTeams([]);
      return;
    }

    setTeams(Array.isArray(data) ? data : []);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await loadPartnerships();
      await loadTeams();
    } catch (error) {
      console.error("Load partnership data error:", error);
      alert("Failed to load partnership data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const generateSlug = (value: string) => {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "");
  };

  const selectedTeamName = useMemo(() => {
    return (
      teams.find((team) => String(team.id) === form.team_id)?.name ||
      "No HBT assigned yet"
    );
  }, [form.team_id, teams]);

  const handleCompanyNameChange = (value: string) => {
    setForm({
      ...form,
      company_name: value,
      slug: generateSlug(value),
    });
  };

  const handleDrop = (targetId: string) => {
    if (!draggedBlockId || draggedBlockId === targetId) return;

    const draggedIndex = blocks.findIndex(
      (block) => block.id === draggedBlockId
    );
    const targetIndex = blocks.findIndex((block) => block.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const updated = [...blocks];
    const [draggedBlock] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedBlock);
    setBlocks(updated);
    setDraggedBlockId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.company_name || !form.slug || !form.team_id) {
      alert("Company name, slug, and HBT team are required");
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
        body: JSON.stringify({
          ...form,
          team_id: Number(form.team_id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to create partnership");
        return;
      }

      alert(`Partnership created successfully.\nPublic URL: /${form.slug}`);

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

      await loadPartnerships();
    } catch (error) {
      console.error("Create partnership error:", error);
      alert("Failed to create partnership");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this employer partnership? This removes the company portal connection."
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin-partnerships/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to delete partnership");
        return;
      }

      alert("Partnership deleted successfully");
      await loadPartnerships();
    } catch (error) {
      console.error("Delete partnership error:", error);
      alert("Failed to delete partnership");
    }
  };

  return (
    <AdminLayout title="Employer Partnerships">
      <div className="space-y-8">
        <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-700">
            Partnership Builder
          </p>

          <h2 className="mt-3 text-3xl font-black text-slate-950">
            Create company portals and assign the correct Home Buying Team
          </h2>

          <p className="mt-3 max-w-3xl text-slate-600">
            This is the client-facing setup area. Admins can create employer
            companies, connect them to an HBT team, and instantly generate a
            public branded URL.
          </p>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-black text-slate-950">
              Add Employer Company
            </h2>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:col-span-2"
                placeholder="Company Name"
                value={form.company_name}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
              />

              <input
                className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="URL Slug"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: generateSlug(e.target.value) })
                }
              />

              <select
                className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                value={form.team_id}
                onChange={(e) => setForm({ ...form, team_id: e.target.value })}
              >
                <option value="">Assign HBT Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <input
                className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:col-span-2"
                placeholder="Logo URL"
                value={form.logo_url}
                onChange={(e) =>
                  setForm({ ...form, logo_url: e.target.value })
                }
              />

              <input
                className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Website URL"
                value={form.website}
                onChange={(e) =>
                  setForm({ ...form, website: e.target.value })
                }
              />

              <input
                className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Contact Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />

              <input
                className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Contact Email"
                value={form.contact_email}
                onChange={(e) =>
                  setForm({ ...form, contact_email: e.target.value })
                }
              />

              <select
                className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button
                disabled={saving}
                className="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:bg-slate-400 md:col-span-2"
              >
                {saving ? "Creating..." : "Create Partnership"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-300">
              Live Preview
            </p>

            <h3 className="mt-3 text-3xl font-black">
              {form.company_name || "Company Name"}
            </h3>

            <p className="mt-2 text-blue-100">/{form.slug || "companyslug"}</p>

            <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-slate-200">
              Assigned HBT: <strong>{selectedTeamName}</strong>
            </p>

            <div className="mt-5 rounded-3xl bg-white p-5 text-slate-950">
              <p className="text-sm font-bold text-blue-700">
                Employee Benefit Portal
              </p>

              <h4 className="mt-2 text-2xl font-black">
                Home-buying guidance for employees
              </h4>

              <p className="mt-2 text-sm text-slate-600">
                Employees will access resources, quizzes, events, and booking
                support from this branded portal.
              </p>
            </div>
          </section>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Drag-and-drop portal section plan
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                This builder plan helps the client decide the order of sections
                on employer portals.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              WordPress-style planning
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {blocks.map((block, index) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => setDraggedBlockId(block.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(block.id)}
                className={`cursor-grab rounded-2xl border p-5 transition hover:-translate-y-1 hover:shadow-lg ${
                  draggedBlockId === block.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Block {index + 1}
                </p>

                <h3 className="mt-2 text-lg font-black text-slate-950">
                  {block.title}
                </h3>

                <p className="mt-2 text-sm text-slate-600">
                  {block.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-black text-slate-950">
            Current Employer Partnerships
          </h2>

          {loading ? (
            <p>Loading partnerships...</p>
          ) : partnerships.length === 0 ? (
            <p>No partnerships found.</p>
          ) : (
            <div className="space-y-4">
              {partnerships.map((partnership) => (
                <div
                  key={partnership.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      {partnership.employer_name}
                    </h3>

                    <p className="text-sm text-slate-600">
                      URL: /{partnership.slug}
                    </p>

                    <p className="text-sm text-slate-600">
                      HBT Team: {partnership.hbt_name}
                    </p>

                    <p className="text-sm text-slate-600">
                      Status: {partnership.status}
                    </p>

                    {partnership.contact_email && (
                      <p className="text-sm text-slate-600">
                        Email: {partnership.contact_email}
                      </p>
                    )}

                    {partnership.phone && (
                      <p className="text-sm text-slate-600">
                        Phone: {partnership.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={getPublicPortalUrl(partnership.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      View Page
                    </a>

                    <button
                      onClick={() => handleDelete(partnership.id)}
                      className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
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
