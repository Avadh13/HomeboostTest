import { useEffect, useMemo, useState } from "react";
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
type Appointment = { id: number; topic: string; preferred_date?: string | null; status: string; employee_name: string; employee_email: string; team_member_name?: string | null; created_at: string };

type DashboardData = {
  partnership: Partnership;
  employees: Employee[];
  invites: Invite[];
  batches: Batch[];
  submissions: Submission[];
  appointments: Appointment[];
  stats: {
    employees: number;
    invited: number;
    registered: number;
    revoked: number;
    quiz_submissions: number;
    pending_appointments: number;
  };
};

function CompanyDashboard() {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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

  const uploadCsv = async (file: File | null) => {
    if (!file) {
      toast.warning("Please select a CSV file.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.warning("Please upload a valid .csv file.");
      return;
    }

    const ok = confirm("Upload this approved employee list? Only these emails can sign up for your employer portal.");
    if (!ok) return;

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
    const ok = confirm("Revoke this batch? Pending invites from this upload will stop working.");
    if (!ok) return;

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

  const primary = data?.partnership.brand_primary_color || "#2563eb";
  const secondary = data?.partnership.brand_secondary_color || "#eff6ff";

  if (loading) {
    return (
      <main className="theme-page min-h-screen">
        <Navbar />
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="premium-card p-8 text-center font-bold text-slate-500">Loading employer manager dashboard...</div>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="theme-page min-h-screen">
        <Navbar />
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="premium-card p-8 text-center text-slate-500">Employer dashboard is not available for this account.</div>
        </section>
      </main>
    );
  }

  return (
    <main className="theme-page min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 md:py-8">
        <header className="overflow-hidden rounded-[2rem] text-white shadow-xl" style={{ backgroundColor: primary }}>
          <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/75">Employer Manager</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{data.partnership.employer_name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/85 md:text-base">
                Manage approved employee access, review employee progress, and see partnership details connected to {data.partnership.hbt_name || "your Home Buying Team"}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/${data.partnership.slug}`} target="_blank" rel="noreferrer" className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">View Portal</a>
              <Link to="/notifications" className="rounded-full border border-white/30 px-4 py-2 text-sm font-black text-white hover:bg-white/10">Notifications</Link>
              <button onClick={logout} className="rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white">Logout</button>
            </div>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-3" style={{ backgroundColor: secondary }}>
            <div className="rounded-3xl bg-white/90 p-5 text-slate-950"><p className="text-xs font-black uppercase text-slate-400">Portal slug</p><p className="mt-2 text-2xl font-black">/{data.partnership.slug}</p></div>
            <div className="rounded-3xl bg-white/90 p-5 text-slate-950"><p className="text-xs font-black uppercase text-slate-400">HBT Team</p><p className="mt-2 text-2xl font-black">{data.partnership.hbt_name || "Assigned"}</p></div>
            <div className="rounded-3xl bg-white/90 p-5 text-slate-950"><p className="text-xs font-black uppercase text-slate-400">Status</p><p className="mt-2 text-2xl font-black capitalize">{data.partnership.status}</p></div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Employees", data.stats.employees, "text-violet-700", "bg-violet-50"],
            ["Invited", data.stats.invited, "text-blue-700", "bg-blue-50"],
            ["Registered", data.stats.registered, "text-emerald-700", "bg-emerald-50"],
            ["Revoked", data.stats.revoked, "text-red-700", "bg-red-50"],
            ["Quiz Progress", data.stats.quiz_submissions, "text-amber-700", "bg-amber-50"],
            ["Pending Appts", data.stats.pending_appointments, "text-slate-700", "bg-slate-100"],
          ].map(([label, value, tone, bg]) => (
            <div key={String(label)} className="metric-card">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
              <h2 className={`mt-2 rounded-2xl px-3 py-2 text-3xl font-black ${tone} ${bg}`}>{value}</h2>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="premium-card">
            <p className="eyebrow">Employee access</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Upload approved employees</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Upload a CSV with <strong>full_name,email</strong>. Only approved emails can sign up under your employer portal.</p>
            <input type="file" accept=".csv" disabled={uploading} onChange={(e) => uploadCsv(e.target.files ? e.target.files[0] : null)} className="mt-5 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />
            {uploading && <p className="mt-3 text-sm font-black text-blue-600">Uploading...</p>}
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">Security: unknown emails are blocked even if they know the partnership slug.</div>
          </div>

          <div className="premium-card overflow-hidden p-0">
            <div className="border-b border-slate-100 p-4">
              <div className="mb-4"><p className="eyebrow">Employee invite list</p><h2 className="mt-1 text-2xl font-black text-slate-950">Approved access</h2></div>
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <input className="form-field" placeholder="Search employee name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All status</option>
                  <option value="invited">Invited</option>
                  <option value="registered">Registered</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
            </div>
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Employee</th><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead>
                <tbody>{filteredInvites.map((invite) => <tr key={invite.id} className="border-b last:border-0"><td className="p-3 font-black text-slate-950">{invite.full_name}</td><td className="p-3 text-slate-600">{invite.email}</td><td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${invite.status === "registered" ? "bg-emerald-100 text-emerald-700" : invite.status === "revoked" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{invite.status}</span></td><td className="p-3 text-slate-500">{invite.created_at ? new Date(invite.created_at).toLocaleDateString() : "-"}</td></tr>)}</tbody>
              </table>
              {filteredInvites.length === 0 && <p className="p-6 text-center text-slate-500">No employee invites found.</p>}
            </div>
          </div>
        </section>

        <section className="premium-card overflow-hidden p-0">
          <div className="border-b border-slate-100 p-4">
            <p className="eyebrow">Enrollment uploads</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">CSV invite batches</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="p-3">Batch</th>
                  <th className="p-3">File</th>
                  <th className="p-3">Approved</th>
                  <th className="p-3">Skipped</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((batch) => (
                  <tr key={batch.id} className="border-b last:border-0">
                    <td className="p-3 font-black">#{batch.id}</td>
                    <td className="p-3">{batch.original_filename || "CSV Upload"}</td>
                    <td className="p-3 font-bold text-emerald-700">{batch.created_count}</td>
                    <td className="p-3 font-bold text-amber-700">{batch.skipped_count}</td>
                    <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${batch.status === "revoked" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{batch.status}</span></td>
                    <td className="p-3 text-slate-500">{batch.created_at ? new Date(batch.created_at).toLocaleDateString() : "-"}</td>
                    <td className="p-3">{batch.status === "active" ? <button onClick={() => revokeBatch(batch.id)} className="rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700">Revoke</button> : <span className="text-xs text-slate-400">Revoked</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.batches.length === 0 && <p className="p-6 text-center text-slate-500">No CSV upload batches yet.</p>}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="premium-card overflow-hidden p-0">
            <div className="border-b border-slate-100 p-4"><p className="eyebrow">Employee process</p><h2 className="mt-1 text-2xl font-black text-slate-950">Quiz submissions</h2></div>
            <div className="max-h-[420px] overflow-auto"><table className="w-full border-collapse text-sm"><thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Employee</th><th className="p-3">Quiz</th><th className="p-3">Progress</th><th className="p-3">Submitted</th></tr></thead><tbody>{data.submissions.map((submission) => <tr key={submission.id} className="border-b last:border-0"><td className="p-3"><p className="font-black">{submission.employee_name}</p><p className="text-xs text-slate-500">{submission.employee_email}</p></td><td className="p-3">{submission.quiz_title}</td><td className="p-3"><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{submission.follow_up_status}</span></td><td className="p-3 text-slate-500">{submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : "-"}</td></tr>)}</tbody></table>{data.submissions.length === 0 && <p className="p-6 text-center text-slate-500">No quiz submissions yet.</p>}</div>
          </div>

          <div className="premium-card overflow-hidden p-0">
            <div className="border-b border-slate-100 p-4"><p className="eyebrow">Appointments</p><h2 className="mt-1 text-2xl font-black text-slate-950">Employee meetings</h2></div>
            <div className="max-h-[420px] overflow-auto"><table className="w-full border-collapse text-sm"><thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Employee</th><th className="p-3">Topic</th><th className="p-3">Advisor</th><th className="p-3">Status</th></tr></thead><tbody>{data.appointments.map((appointment) => <tr key={appointment.id} className="border-b last:border-0"><td className="p-3"><p className="font-black">{appointment.employee_name}</p><p className="text-xs text-slate-500">{appointment.employee_email}</p></td><td className="p-3">{appointment.topic}</td><td className="p-3">{appointment.team_member_name || "-"}</td><td className="p-3"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{appointment.status}</span></td></tr>)}</tbody></table>{data.appointments.length === 0 && <p className="p-6 text-center text-slate-500">No appointments yet.</p>}</div>
          </div>
        </section>

        <section className="premium-card">
          <p className="eyebrow">Partnership details</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Company + HBT information</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-5"><h3 className="text-lg font-black text-slate-950">Employer</h3><p className="mt-2 text-slate-600">{data.partnership.employer_name}</p><p className="text-slate-600">{data.partnership.contact_email || "No contact email"}</p><p className="text-slate-600">{data.partnership.phone || "No phone"}</p></div>
            <div className="rounded-3xl bg-slate-50 p-5"><h3 className="text-lg font-black text-slate-950">Home Buying Team</h3><p className="mt-2 text-slate-600">{data.partnership.hbt_name}</p><p className="text-slate-600">{data.partnership.hbt_email || "No email"}</p><p className="text-slate-600">{data.partnership.hbt_phone || "No phone"}</p></div>
          </div>
        </section>
      </section>
      <ChatWidget />
    </main>
  );
}

export default CompanyDashboard;
