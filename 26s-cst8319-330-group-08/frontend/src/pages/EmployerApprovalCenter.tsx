import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type ApprovalRequest = {
  id: number;
  requested_company_name: string;
  employer_name?: string | null;
  team_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_title?: string | null;
  approval_status: string;
  review_note?: string | null;
  requested_at?: string | null;
};

type Contact = {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  is_primary?: number;
};

type SubmitEventLike = { preventDefault: () => void };

const statusTone = (status: string) => {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "needs_info") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
};

function EmployerApprovalCenter() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
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
  const canReview = ["admin", "super_admin", "hbt_admin"].includes(user?.role);
  const needsPartnershipId = ["admin", "super_admin", "hbt_admin"].includes(user?.role);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/employer-approval/requests`, { headers: authHeaders }).then((res) => res.json()),
      form.partnership_id ? fetch(`${API_BASE_URL}/employer-approval/contacts?partnership_id=${encodeURIComponent(form.partnership_id)}`, { headers: authHeaders }).then((res) => res.json()).catch(() => ({ contacts: [] })) : Promise.resolve({ contacts: [] }),
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

  const createRequest = async (event: SubmitEventLike) => {
    event.preventDefault();
    setNotice("");
    const response = await fetch(`${API_BASE_URL}/employer-approval/requests`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok || data.status !== "success") return setNotice(data.message || "Could not create request");
    setNotice("Employer approval request created.");
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

  const updateStatus = async (id: number, approval_status: string) => {
    const review_note = window.prompt("Review note (optional)") || "";
    const response = await fetch(`${API_BASE_URL}/employer-approval/requests/${id}/status`, { method: "PUT", headers: jsonHeaders, body: JSON.stringify({ approval_status, review_note }) });
    const data = await response.json();
    setNotice(data.status === "success" ? "Approval status updated." : data.message || "Could not update status");
    loadData();
  };

  const removeContact = async (id: number) => {
    await fetch(`${API_BASE_URL}/employer-approval/contacts/${id}`, { method: "DELETE", headers: authHeaders });
    loadData();
  };

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container space-y-6">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Employer Approval + Point of Contact</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Manage employer approval before rollout.</h1>
            <p className="mt-4 max-w-3xl text-slate-300">Track approval status, company contacts, and who should coordinate employee invitations.</p>
          </div>

          {notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700 ring-1 ring-blue-100">{notice}</div>}

          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <div className="space-y-6">
              <form onSubmit={createRequest} className="premium-card space-y-4">
                <p className="eyebrow text-blue-600">Approval request</p>
                <h2 className="text-2xl font-black">Submit employer approval</h2>
                {needsPartnershipId && <label className="grid gap-2 text-sm font-black text-slate-700">Partnership ID<input required value={form.partnership_id} onChange={(e) => setForm({ ...form, partnership_id: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>}
                <label className="grid gap-2 text-sm font-black text-slate-700">Company name<input required value={form.requested_company_name} onChange={(e) => setForm({ ...form, requested_company_name: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
                <label className="grid gap-2 text-sm font-black text-slate-700">Contact name<input required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
                <label className="grid gap-2 text-sm font-black text-slate-700">Contact email<input required type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
                <div className="grid gap-3 md:grid-cols-2"><input placeholder="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /><input placeholder="Title" value={form.contact_title} onChange={(e) => setForm({ ...form, contact_title: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></div>
                <button className="btn-primary w-full justify-center">Submit Approval Request</button>
              </form>

              <form onSubmit={saveContact} className="premium-card space-y-4">
                <p className="eyebrow text-violet-600">Point of contact</p>
                <h2 className="text-2xl font-black">Add company POC</h2>
                <label className="grid gap-2 text-sm font-black text-slate-700">Name<input required value={contactForm.full_name} onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
                <label className="grid gap-2 text-sm font-black text-slate-700">Email<input required type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
                <div className="grid gap-3 md:grid-cols-2"><input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /><input placeholder="Title" value={contactForm.title} onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></div>
                <label className="flex items-center gap-2 text-sm font-black text-slate-700"><input type="checkbox" checked={contactForm.is_primary} onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })} /> Primary contact</label>
                <button className="btn-secondary w-full justify-center">Save Contact</button>
              </form>
            </div>

            <section className="space-y-6">
              <div className="premium-card">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow text-blue-600">Approval queue</p><h2 className="text-2xl font-black">Requests</h2></div><button onClick={loadData} className="btn-secondary">Refresh</button></div>
                {loading ? <div className="loading-state">Loading...</div> : requests.length === 0 ? <div className="empty-state">No approval requests yet.</div> : <div className="space-y-3">{requests.map((request) => <article key={request.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-950">{request.requested_company_name || request.employer_name}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{request.contact_name} · {request.contact_email}</p><p className="mt-1 text-xs font-bold text-slate-400">{request.team_name || "Team not set"}</p>{request.review_note && <p className="mt-2 text-sm font-semibold text-slate-600">Note: {request.review_note}</p>}</div><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusTone(request.approval_status)}`}>{request.approval_status.replace(/_/g, " ")}</span></div>{canReview && <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => updateStatus(request.id, "approved")} className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">Approve</button><button onClick={() => updateStatus(request.id, "needs_info")} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">Need Info</button><button onClick={() => updateStatus(request.id, "rejected")} className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-black text-red-700">Reject</button></div>}</article>)}</div>}
              </div>

              <div className="premium-card">
                <p className="eyebrow text-violet-600">Company POC list</p>
                <h2 className="mt-1 text-2xl font-black">Points of contact</h2>
                <div className="mt-5 space-y-3">{contacts.length === 0 ? <div className="empty-state">No contacts yet.</div> : contacts.map((contact) => <div key={contact.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"><div><h3 className="font-black text-slate-950">{contact.full_name} {contact.is_primary ? <span className="text-xs text-blue-700">Primary</span> : null}</h3><p className="text-sm font-semibold text-slate-500">{contact.email} · {contact.title || "Contact"}</p></div><button onClick={() => removeContact(contact.id)} className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">Remove</button></div>)}</div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

export default EmployerApprovalCenter;
