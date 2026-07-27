import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type EmployerApprovalCenterProps = {
  embedded?: boolean;
  adminMode?: boolean;
};

type ApprovalRequest = {
  id: number;
  partnership_id?: number | null;
  requested_company_name: string;
  employer_name?: string | null;
  team_name?: string | null;
  requested_by_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_title?: string | null;
  approval_status: string;
  review_note?: string | null;
  reviewed_by_name?: string | null;
  requested_at?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
};

type Contact = {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  is_primary?: number;
};

type ActivationInvite = {
  invite_link?: string | null;
  invite_code?: string | null;
  expires_at?: string | null;
};

type SubmitEventLike = { preventDefault: () => void };

const statusTone = (status: string) => {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "needs_info") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";

function EmployerApprovalCenter({ embedded = false, adminMode = false }: EmployerApprovalCenterProps) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const isAdminView = adminMode || ["admin", "super_admin"].includes(user?.role);
  const canReview = ["admin", "super_admin"].includes(user?.role);
  const canSubmit = !isAdminView && ["hbt_admin", "company", "company_admin"].includes(user?.role);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activationInvite, setActivationInvite] = useState<ActivationInvite | null>(null);
  const [form, setForm] = useState({
    partnership_id: user?.partnership_id ? String(user.partnership_id) : "",
    requested_company_name: "",
    contact_name: user?.full_name || "",
    contact_email: user?.email || "",
    contact_phone: "",
    contact_title: "",
  });
  const [contactForm, setContactForm] = useState({ full_name: "", email: "", phone: "", title: "", is_primary: true });

  const authHeaders = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const needsPartnershipId = !user?.partnership_id;

  const loadData = () => {
    setLoading(true);
    const contactRequest = !isAdminView && form.partnership_id
      ? fetch(`${API_BASE_URL}/employer-approval/contacts?partnership_id=${encodeURIComponent(form.partnership_id)}`, { headers: authHeaders })
          .then((res) => res.json())
          .catch(() => ({ contacts: [] }))
      : Promise.resolve({ contacts: [] });

    Promise.all([
      fetch(`${API_BASE_URL}/employer-approval/requests`, { headers: authHeaders }).then((res) => res.json()),
      contactRequest,
    ])
      .then(([requestData, contactData]) => {
        setRequests(Array.isArray(requestData.requests) ? requestData.requests : []);
        setContacts(Array.isArray(contactData.contacts) ? contactData.contacts : []);
      })
      .catch(() => {
        setRequests([]);
        setContacts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (statusFilter !== "all" && request.approval_status !== statusFilter) return false;
      if (!query) return true;
      return [
        request.requested_company_name,
        request.employer_name,
        request.team_name,
        request.contact_name,
        request.contact_email,
        request.requested_by_name,
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [requests, search, statusFilter]);

  const counts = useMemo(() => ({
    pending: requests.filter((item) => item.approval_status === "pending").length,
    needsInfo: requests.filter((item) => item.approval_status === "needs_info").length,
    approved: requests.filter((item) => item.approval_status === "approved").length,
    rejected: requests.filter((item) => item.approval_status === "rejected").length,
  }), [requests]);

  const createRequest = async (event: SubmitEventLike) => {
    event.preventDefault();
    setNotice("");
    const response = await fetch(`${API_BASE_URL}/employer-approval/requests`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok || data.status !== "success") return setNotice(data.message || "Could not create request");
    setNotice("Employer approval request submitted to Admin.");
    setForm((current) => ({ ...current, requested_company_name: "", contact_phone: "", contact_title: "" }));
    loadData();
  };

  const saveContact = async (event: SubmitEventLike) => {
    event.preventDefault();
    setNotice("");
    const body = { ...contactForm, partnership_id: form.partnership_id || user?.partnership_id };
    const response = await fetch(`${API_BASE_URL}/employer-approval/contacts`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok || data.status !== "success") return setNotice(data.message || "Could not save contact");
    setNotice("Point of contact saved.");
    setContactForm({ full_name: "", email: "", phone: "", title: "", is_primary: true });
    loadData();
  };

  const updateStatus = async (request: ApprovalRequest, approvalStatus: string) => {
    if (!canReview) return;
    if (approvalStatus === "approved" && !window.confirm(`Approve ${request.requested_company_name} and prepare Company Manager access?`)) return;

    let reviewNote = "";
    if (approvalStatus === "needs_info" || approvalStatus === "rejected") {
      reviewNote = window.prompt(approvalStatus === "needs_info" ? "What information is required?" : "Reason for rejection")?.trim() || "";
      if (!reviewNote) return setNotice("A review note is required for this decision.");
    } else {
      reviewNote = window.prompt("Approval note (optional)")?.trim() || "";
    }

    setNotice("");
    setActivationInvite(null);
    const response = await fetch(`${API_BASE_URL}/employer-approval/requests/${request.id}/status`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ approval_status: approvalStatus, review_note: reviewNote }),
    });
    const data = await response.json();
    if (!response.ok || data.status !== "success") return setNotice(data.message || "Could not update status");
    setNotice(data.message || "Approval status updated.");
    setActivationInvite(data.activation_invite || null);
    loadData();
  };

  const removeContact = async (id: number) => {
    await fetch(`${API_BASE_URL}/employer-approval/contacts/${id}`, { method: "DELETE", headers: authHeaders });
    loadData();
  };

  const copyActivationLink = async () => {
    if (!activationInvite?.invite_link) return;
    await navigator.clipboard.writeText(activationInvite.invite_link);
    setNotice("Activation link copied.");
  };

  const requestCard = (request: ApprovalRequest) => (
    <article key={request.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-lg font-black text-slate-950">{request.requested_company_name || request.employer_name}</h3>
          <p className="mt-1 break-words text-sm font-semibold text-slate-500">{request.contact_name} · {request.contact_email}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">{request.team_name || "Team not set"} · Partnership #{request.partnership_id || "—"}</p>
          <div className="mt-3 grid gap-1 text-xs font-semibold text-slate-500 md:grid-cols-2">
            <span>Submitted: {formatDate(request.requested_at)}</span>
            <span>Requested by: {request.requested_by_name || "Unknown"}</span>
            {request.reviewed_at && <span>Reviewed: {formatDate(request.reviewed_at)}</span>}
            {request.reviewed_by_name && <span>Reviewer: {request.reviewed_by_name}</span>}
          </div>
          {request.review_note && <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-100">Review note: {request.review_note}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusTone(request.approval_status)}`}>{request.approval_status.replace(/_/g, " ")}</span>
      </div>
      {canReview && <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => updateStatus(request, "approved")} className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-700">Approve</button>
        <button type="button" onClick={() => updateStatus(request, "needs_info")} className="rounded-full bg-amber-100 px-4 py-2 text-xs font-black text-amber-700">Need Info</button>
        <button type="button" onClick={() => updateStatus(request, "rejected")} className="rounded-full bg-red-100 px-4 py-2 text-xs font-black text-red-700">Reject</button>
      </div>}
    </article>
  );

  const adminContent = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="premium-card"><p className="eyebrow text-blue-600">Pending</p><p className="mt-2 text-4xl font-black">{counts.pending}</p></div>
        <div className="premium-card"><p className="eyebrow text-amber-600">Need info</p><p className="mt-2 text-4xl font-black">{counts.needsInfo}</p></div>
        <div className="premium-card"><p className="eyebrow text-emerald-600">Approved</p><p className="mt-2 text-4xl font-black">{counts.approved}</p></div>
        <div className="premium-card"><p className="eyebrow text-red-600">Rejected</p><p className="mt-2 text-4xl font-black">{counts.rejected}</p></div>
      </div>

      {activationInvite?.invite_link && <div className="rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Company Manager activation ready</p>
        <p className="mt-2 break-all text-sm font-bold text-slate-800">{activationInvite.invite_link}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={copyActivationLink} className="btn-primary">Copy activation link</button>
          {activationInvite.invite_code && <span className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700">Code: {activationInvite.invite_code}</span>}
        </div>
      </div>}

      <section className="premium-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow text-blue-600">Admin approval queue</p>
            <h2 className="mt-1 text-3xl font-black">Employer requests</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Review requests from every Home Buying Team. Only Admin and Super Admin can make decisions.</p>
          </div>
          <button type="button" onClick={loadData} className="btn-secondary self-start xl:self-auto">Refresh</button>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, contact, or HBT" className="form-field" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="form-field">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="needs_info">Need info</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="mt-6 space-y-3">
          {loading ? <div className="loading-state">Loading...</div> : filteredRequests.length === 0 ? <div className="empty-state">No matching employer requests.</div> : filteredRequests.map(requestCard)}
        </div>
      </section>
    </div>
  );

  const hbtContent = (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Employer onboarding</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Submit employers for Admin approval.</h1>
        <p className="mt-4 max-w-3xl text-slate-300">Create a request, track its status, read Admin notes, and maintain the employer point of contact.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          {canSubmit && <form onSubmit={createRequest} className="premium-card space-y-4">
            <p className="eyebrow text-blue-600">New employer request</p>
            <h2 className="text-2xl font-black">Submit for approval</h2>
            {needsPartnershipId && <label className="grid gap-2 text-sm font-black text-slate-700">Partnership ID<input required value={form.partnership_id} onChange={(e) => setForm({ ...form, partnership_id: e.target.value })} className="form-field" /></label>}
            <label className="grid gap-2 text-sm font-black text-slate-700">Company name<input required value={form.requested_company_name} onChange={(e) => setForm({ ...form, requested_company_name: e.target.value })} className="form-field" /></label>
            <label className="grid gap-2 text-sm font-black text-slate-700">Contact name<input required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="form-field" /></label>
            <label className="grid gap-2 text-sm font-black text-slate-700">Contact email<input required type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="form-field" /></label>
            <div className="grid gap-3 md:grid-cols-2"><input placeholder="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="form-field" /><input placeholder="Title" value={form.contact_title} onChange={(e) => setForm({ ...form, contact_title: e.target.value })} className="form-field" /></div>
            <button className="btn-primary w-full justify-center">Submit Approval Request</button>
          </form>}

          <form onSubmit={saveContact} className="premium-card space-y-4">
            <p className="eyebrow text-violet-600">Point of contact</p>
            <h2 className="text-2xl font-black">Add company POC</h2>
            <label className="grid gap-2 text-sm font-black text-slate-700">Name<input required value={contactForm.full_name} onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })} className="form-field" /></label>
            <label className="grid gap-2 text-sm font-black text-slate-700">Email<input required type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="form-field" /></label>
            <div className="grid gap-3 md:grid-cols-2"><input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="form-field" /><input placeholder="Title" value={contactForm.title} onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })} className="form-field" /></div>
            <label className="flex items-center gap-2 text-sm font-black text-slate-700"><input type="checkbox" checked={contactForm.is_primary} onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })} /> Primary contact</label>
            <button className="btn-secondary w-full justify-center">Save Contact</button>
          </form>
        </div>

        <section className="space-y-6">
          <div className="premium-card">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow text-blue-600">My submitted requests</p><h2 className="text-2xl font-black">Approval status</h2></div><button type="button" onClick={loadData} className="btn-secondary">Refresh</button></div>
            {loading ? <div className="loading-state">Loading...</div> : requests.length === 0 ? <div className="empty-state">No approval requests yet.</div> : <div className="space-y-3">{requests.map(requestCard)}</div>}
          </div>

          <div className="premium-card">
            <p className="eyebrow text-violet-600">Company POC list</p>
            <h2 className="mt-1 text-2xl font-black">Points of contact</h2>
            <div className="mt-5 space-y-3">{contacts.length === 0 ? <div className="empty-state">No contacts yet.</div> : contacts.map((contact) => <div key={contact.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"><div><h3 className="font-black text-slate-950">{contact.full_name} {contact.is_primary ? <span className="text-xs text-blue-700">Primary</span> : null}</h3><p className="text-sm font-semibold text-slate-500">{contact.email} · {contact.title || "Contact"}</p></div><button type="button" onClick={() => removeContact(contact.id)} className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">Remove</button></div>)}</div>
          </div>
        </section>
      </div>
    </div>
  );

  const content = isAdminView ? adminContent : hbtContent;

  if (embedded) {
    return <div className="space-y-6">{notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700 ring-1 ring-blue-100">{notice}</div>}{content}</div>;
  }

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container space-y-6">
          {notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700 ring-1 ring-blue-100">{notice}</div>}
          {content}
        </div>
      </section>
    </main>
  );
}

export default EmployerApprovalCenter;
