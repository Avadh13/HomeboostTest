import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";
import ChatWidget from "../components/ChatWidget";
import { useToast } from "../components/ToastProvider";

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
  hbt_name?: string | null;
  hbt_email?: string | null;
  hbt_phone?: string | null;
  hbt_website?: string | null;
};

type Employee = { id: number; full_name: string; email: string; is_active: number; created_at: string };
type Invite = { id: number; full_name: string; email: string; status: string; created_at: string; registered_at?: string | null; revoked_at?: string | null };
type Batch = { id: number; original_filename: string; created_count: number; skipped_count: number; status: string; created_at: string; revoked_at?: string | null };
type Submission = { id: number; quiz_title: string; employee_name: string; employee_email: string; follow_up_status: string; submitted_at: string };

type DashboardData = {
  partnership: Partnership;
  employees: Employee[];
  invites: Invite[];
  batches: Batch[];
  submissions: Submission[];
  stats: {
    employees: number;
    invited: number;
    registered: number;
    revoked: number;
    quiz_submissions: number;
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const statusClass = (status: string) => {
  if (["registered", "active", "confirmed", "completed"].includes(status)) return "bg-emerald-100 text-emerald-700";
  if (["revoked", "cancelled", "disabled"].includes(status)) return "bg-red-100 text-red-700";
  if (["pending", "invited"].includes(status)) return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join("") || "E";

function CompanyDashboard() {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [addingInvite, setAddingInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/company-manager/dashboard`, { headers });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message || "Failed to load employer dashboard.");
        setData(null);
        return;
      }

      setData(payload);
    } catch (error) {
      console.error("Company dashboard load failed:", error);
      toast.error("Failed to load employer dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredInvites = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.invites || []).filter((invite) => {
      const matchesSearch = !query || [invite.full_name, invite.email].join(" ").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || invite.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.invites, search, statusFilter]);

  const addIndividualInvite = async (event: FormEvent) => {
    event.preventDefault();

    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.warning("Full name and email are required.");
      return;
    }

    try {
      setAddingInvite(true);
      const response = await fetch(`${API_BASE_URL}/company-manager/invites`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: inviteName.trim(), email: inviteEmail.trim() }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message || "Failed to add employee invite.");
        return;
      }

      toast.success(payload.message || "Employee invite added.");
      setInviteName("");
      setInviteEmail("");
      await loadDashboard();
    } catch (error) {
      console.error("Individual invite failed:", error);
      toast.error("Failed to add employee invite.");
    } finally {
      setAddingInvite(false);
    }
  };

  const uploadCsv = async (file: File | null) => {
    if (!file) {
      toast.warning("Please select a CSV file.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.warning("Please upload a valid .csv file.");
      return;
    }

    const confirmed = confirm("Upload this approved employee list? Only these emails can sign up for your employer portal.");
    if (!confirmed) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/company-manager/invites/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message || "CSV upload failed.");
        return;
      }

      toast.success(`Invite list uploaded. Approved ${payload.invited || 0}, skipped ${payload.skipped || 0}.`);
      await loadDashboard();
    } catch (error) {
      console.error("Company CSV upload failed:", error);
      toast.error("CSV upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const revokeBatch = async (batchId: number) => {
    const confirmed = confirm("Revoke this batch? Pending invites from this upload will stop working.");
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/company-manager/batches/${batchId}/revoke`, {
        method: "PUT",
        headers,
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message || "Failed to revoke batch.");
        return;
      }

      toast.success(`Batch revoked. Revoked invites: ${payload.revoked_invites || 0}.`);
      await loadDashboard();
    } catch {
      toast.error("Failed to revoke batch.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <main className="theme-page min-h-screen">
        <Navbar />
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="loading-state">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="font-black text-slate-800">Loading employer dashboard...</p>
            <p className="mt-2 text-sm text-slate-500">Preparing employee progress, invites, and partnership details.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="theme-page min-h-screen">
        <Navbar />
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="empty-state">
            <h1 className="text-3xl font-black text-slate-950">Employer dashboard unavailable</h1>
            <p className="mt-2 text-slate-600">This account is not linked to an active employer partnership yet.</p>
            <Link to="/login" className="btn-primary mt-6">Back to login</Link>
          </div>
        </section>
      </main>
    );
  }

  const primary = data.partnership.brand_primary_color || "#2563eb";
  const totalInvites = Math.max(data.stats.invited + data.stats.registered + data.stats.revoked, 1);
  const registrationRate = Math.round((data.stats.registered / totalInvites) * 100);
  const recentEmployees = data.employees.slice(0, 6);
  const recentSubmissions = data.submissions.slice(0, 8);
  const latestBatch = data.batches[0];

  const statCards = [
    { label: "Invited", value: data.stats.invited, helper: "Waiting signup", className: "bg-blue-50 text-blue-700" },
    { label: "Registered", value: data.stats.registered, helper: `${registrationRate}% signup rate`, className: "bg-emerald-50 text-emerald-700" },
    { label: "Revoked", value: data.stats.revoked, helper: "Blocked invites", className: "bg-red-50 text-red-700" },
    { label: "Quiz Progress", value: data.stats.quiz_submissions, helper: "Submitted forms", className: "bg-amber-50 text-amber-700" },
  ];

  return (
    <main className="theme-page min-h-screen overflow-hidden">
      <Navbar />

      <section className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-7">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/60 text-white shadow-2xl shadow-violet-950/20" style={{ backgroundColor: primary }}>
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-black/10 blur-3xl" />

          <div className="relative grid gap-6 p-5 md:p-7 lg:grid-cols-[1fr_360px] lg:items-stretch">
            <div className="flex min-h-[260px] flex-col justify-between">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  Employer Manager Workspace
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/20 text-2xl font-black backdrop-blur">
                    {data.partnership.logo_url ? <img src={data.partnership.logo_url} alt={data.partnership.employer_name} className="h-full w-full object-cover" /> : data.partnership.employer_name.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight md:text-5xl">{data.partnership.employer_name}</h1>
                    <p className="mt-2 text-sm font-semibold text-white/80 md:text-base">/{data.partnership.slug} · {data.partnership.status}</p>
                  </div>
                </div>

                <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/85 md:text-base">
                  Manage employee access, monitor employee progress, review quiz activity, and keep the partnership aligned with {data.partnership.hbt_name || "your Home Buying Team"}.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <a href={`/${data.partnership.slug}`} target="_blank" rel="noreferrer" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg hover:bg-white/90">View Portal</a>
                <Link to="/notifications" className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10">Notifications</Link>
                <button onClick={logout} className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:bg-red-700">Logout</button>
              </div>
            </div>

            <aside className="rounded-[1.75rem] bg-white/15 p-5 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">Signup conversion</p>
              <div className="mt-5 rounded-full bg-white/20 p-1">
                <div className="h-3 rounded-full bg-white transition-all" style={{ width: `${Math.min(registrationRate, 100)}%` }} />
              </div>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-5xl font-black">{registrationRate}%</p>
                  <p className="mt-1 text-sm font-semibold text-white/75">approved employees registered</p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-3 text-right">
                  <p className="text-2xl font-black">{data.stats.registered}</p>
                  <p className="text-xs font-bold uppercase text-white/70">Registered</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs font-black uppercase tracking-wide text-white/60">HBT Team</p><p className="mt-1 font-black">{data.partnership.hbt_name || "Assigned team"}</p></div>
                <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs font-black uppercase tracking-wide text-white/60">Latest Upload</p><p className="mt-1 font-black">{latestBatch ? `Batch #${latestBatch.id}` : "No CSV uploaded"}</p></div>
              </div>
            </aside>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="metric-card">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{card.label}</p>
              <h2 className={`mt-2 rounded-2xl px-3 py-2 text-3xl font-black ${card.className}`}>{card.value}</h2>
              <p className="mt-2 text-xs font-bold text-slate-500">{card.helper}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="grid gap-5">
            <form onSubmit={addIndividualInvite} className="premium-card">
              <div className="flex items-start justify-between gap-4">
                <div><p className="eyebrow">Single employee</p><h2 className="mt-1 text-2xl font-black text-slate-950">Add individual invite</h2></div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Fast add</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">Add one approved employee without uploading a CSV.</p>
              <div className="mt-5 grid gap-3">
                <input className="form-field" placeholder="Employee full name" value={inviteName} onChange={(event) => setInviteName(event.target.value)} />
                <input className="form-field" type="email" placeholder="employee@company.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
                <button type="submit" disabled={addingInvite} className="btn-primary w-full disabled:opacity-60">{addingInvite ? "Adding..." : "Add Employee Invite"}</button>
              </div>
            </form>

            <div className="premium-card">
              <div className="flex items-start justify-between gap-4">
                <div><p className="eyebrow">Bulk upload</p><h2 className="mt-1 text-2xl font-black text-slate-950">Upload employee CSV</h2></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Protected</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">Upload a CSV with <strong>full_name,email</strong>. Only approved emails can sign up under your employer portal.</p>
              <label className="mt-5 block rounded-[1.5rem] border-2 border-dashed border-violet-200 bg-violet-50/50 p-5 text-center transition hover:border-violet-300 hover:bg-violet-50">
                <input type="file" accept=".csv" disabled={uploading} onChange={(event) => uploadCsv(event.target.files ? event.target.files[0] : null)} className="hidden" />
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">⬆</span>
                <span className="mt-3 block text-sm font-black text-slate-900">{uploading ? "Uploading..." : "Choose employee CSV"}</span>
                <span className="mt-1 block text-xs font-semibold text-slate-500">Required columns: full_name,email</span>
              </label>
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">Unknown emails are blocked even if they know the partnership slug.</div>
            </div>
          </div>

          <div className="premium-card">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <div><p className="eyebrow">Employee access list</p><h2 className="mt-1 text-2xl font-black text-slate-950">Approved employees</h2><p className="mt-1 text-sm text-slate-500">Card view for invited, registered, and revoked access.</p></div>
              <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                <input className="form-field" placeholder="Search name or email..." value={search} onChange={(event) => setSearch(event.target.value)} />
                <select className="form-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All status</option>
                  <option value="invited">Invited</option>
                  <option value="registered">Registered</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
            </div>

            <div className="mt-5 grid max-h-[640px] gap-3 overflow-auto pr-1 md:grid-cols-2">
              {filteredInvites.map((invite) => (
                <article key={invite.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-violet-700 shadow-sm">{initials(invite.full_name)}</div>
                      <div className="min-w-0"><h3 className="truncate font-black text-slate-950">{invite.full_name}</h3><p className="truncate text-xs font-semibold text-slate-500">{invite.email}</p></div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusClass(invite.status)}`}>{invite.status}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
                    <div className="rounded-2xl bg-white p-3"><p className="uppercase tracking-wide text-slate-400">Created</p><p className="mt-1 text-slate-700">{formatDate(invite.created_at)}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="uppercase tracking-wide text-slate-400">Registered</p><p className="mt-1 text-slate-700">{formatDate(invite.registered_at)}</p></div>
                  </div>
                </article>
              ))}
              {filteredInvites.length === 0 && <p className="rounded-3xl bg-slate-50 p-8 text-center text-slate-500 md:col-span-2">No employee invites found.</p>}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="premium-card">
            <div className="mb-5"><p className="eyebrow">Enrollment uploads</p><h2 className="mt-1 text-2xl font-black text-slate-950">CSV invite batches</h2></div>
            <div className="grid gap-3">
              {data.batches.map((batch) => (
                <article key={batch.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Batch #{batch.id}</p><h3 className="mt-1 font-black text-slate-950">{batch.original_filename || "CSV Upload"}</h3><p className="mt-1 text-xs font-semibold text-slate-500">Uploaded {formatDate(batch.created_at)}</p></div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(batch.status)}`}>{batch.status}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-2xl bg-white p-3"><p className="text-2xl font-black text-emerald-700">{batch.created_count}</p><p className="text-xs font-bold text-slate-500">Approved</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-2xl font-black text-amber-700">{batch.skipped_count}</p><p className="text-xs font-bold text-slate-500">Skipped</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-2xl font-black text-slate-700">{batch.status === "active" ? "Open" : "Off"}</p><p className="text-xs font-bold text-slate-500">Access</p></div>
                  </div>
                  {batch.status === "active" && <button onClick={() => revokeBatch(batch.id)} className="mt-4 rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700">Revoke pending invites</button>}
                </article>
              ))}
              {data.batches.length === 0 && <p className="rounded-3xl bg-slate-50 p-8 text-center text-slate-500">No CSV upload batches yet.</p>}
            </div>
          </div>

          <div className="premium-card">
            <div className="mb-5"><p className="eyebrow">Recently registered</p><h2 className="mt-1 text-2xl font-black text-slate-950">Employee account activity</h2></div>
            <div className="grid gap-3 md:grid-cols-2">
              {recentEmployees.map((employee) => (
                <article key={employee.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-black text-violet-700 shadow-sm">{initials(employee.full_name)}</div><div><h3 className="font-black text-slate-950">{employee.full_name}</h3><p className="text-xs font-semibold text-slate-500">{employee.email}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-black ${employee.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{employee.is_active ? "Active" : "Disabled"}</span></div>
                  <p className="mt-4 rounded-2xl bg-white p-3 text-xs font-bold text-slate-500">Joined {formatDate(employee.created_at)}</p>
                </article>
              ))}
              {recentEmployees.length === 0 && <p className="rounded-3xl bg-slate-50 p-8 text-center text-slate-500 md:col-span-2">No registered employees yet.</p>}
            </div>
          </div>
        </section>

        <section className="premium-card">
          <div className="mb-5"><p className="eyebrow">Employee process</p><h2 className="mt-1 text-2xl font-black text-slate-950">Quiz submissions</h2></div>
          <div className="grid gap-3 md:grid-cols-2">
            {recentSubmissions.map((submission) => (
              <article key={submission.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{submission.employee_name}</h3><p className="text-xs font-semibold text-slate-500">{submission.employee_email}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{submission.follow_up_status}</span></div>
                <div className="mt-4 rounded-2xl bg-white p-3"><p className="text-sm font-black text-slate-800">{submission.quiz_title}</p><p className="mt-1 text-xs font-semibold text-slate-500">Submitted {formatDate(submission.submitted_at)}</p></div>
              </article>
            ))}
            {recentSubmissions.length === 0 && <p className="rounded-3xl bg-slate-50 p-8 text-center text-slate-500 md:col-span-2">No quiz submissions yet.</p>}
          </div>
        </section>

        <section className="premium-card">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="rounded-[1.75rem] p-6 text-white" style={{ backgroundColor: primary }}>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">Partnership details</p>
              <h2 className="mt-3 text-3xl font-black">Company + HBT information</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80">Quick verification for the employer profile and assigned Home Buying Team.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-5"><h3 className="text-lg font-black text-slate-950">Employer</h3><p className="mt-3 font-semibold text-slate-700">{data.partnership.employer_name}</p><p className="text-sm text-slate-600">{data.partnership.contact_email || "No contact email"}</p><p className="text-sm text-slate-600">{data.partnership.phone || "No phone"}</p>{data.partnership.website && <a href={data.partnership.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-black text-violet-700">Open website →</a>}</div>
              <div className="rounded-3xl bg-slate-50 p-5"><h3 className="text-lg font-black text-slate-950">Home Buying Team</h3><p className="mt-3 font-semibold text-slate-700">{data.partnership.hbt_name || "Assigned team"}</p><p className="text-sm text-slate-600">{data.partnership.hbt_email || "No email"}</p><p className="text-sm text-slate-600">{data.partnership.hbt_phone || "No phone"}</p>{data.partnership.hbt_website && <a href={data.partnership.hbt_website} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-black text-violet-700">Open HBT website →</a>}</div>
            </div>
          </div>
        </section>
      </section>

      <ChatWidget />
    </main>
  );
}

export default CompanyDashboard;