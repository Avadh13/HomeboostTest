import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type Invite = {
  id: number;
  full_name: string;
  email: string;
  status: string;
  partnership_id: number;
  invite_code?: string | null;
  invite_link?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

type SubmitEventLike = { preventDefault: () => void };

function InviteCenter() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [partnershipId, setPartnershipId] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const needsPartnershipField = ["admin", "super_admin", "hbt_admin"].includes(user?.role);

  const loadInvites = () => {
    fetch(`${API_BASE_URL}/invites`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setInvites(Array.isArray(data.invites) ? data.invites : []))
      .catch(() => setInvites([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadInvites(); }, []);

  const createInvite = async (event: SubmitEventLike) => {
    event.preventDefault();
    setNotice("");
    const body = { full_name: fullName, email, partnership_id: needsPartnershipField ? partnershipId : undefined };
    const response = await fetch(`${API_BASE_URL}/invites/employee`, { method: "POST", headers, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok || data.status !== "success") {
      setNotice(data.message || "Invite could not be created");
      return;
    }
    setNotice("Invite created. Copy the link or code and send it to the employee.");
    setFullName("");
    setEmail("");
    loadInvites();
  };

  const resend = async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/invites/resend/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    setNotice(data.status === "success" ? "Invite link regenerated." : data.message || "Could not resend invite");
    loadInvites();
  };

  const copyText = async (text?: string | null) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setNotice("Copied to clipboard.");
  };

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container">
          <div className="mb-6 rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Employee Invitation System</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Invite employees with secure links.</h1>
            <p className="mt-4 max-w-3xl text-slate-300">Generate unique invite links or access codes for employees to join their employer portal.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <form onSubmit={createInvite} className="premium-card h-fit space-y-4">
              <p className="eyebrow text-blue-600">New invite</p>
              <h2 className="text-2xl font-black">Create employee invite</h2>
              <label className="grid gap-2 text-sm font-black text-slate-700">Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
              <label className="grid gap-2 text-sm font-black text-slate-700">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>
              {needsPartnershipField && <label className="grid gap-2 text-sm font-black text-slate-700">Partnership ID<input value={partnershipId} onChange={(e) => setPartnershipId(e.target.value)} required className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" /></label>}
              {notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{notice}</div>}
              <button className="btn-primary w-full justify-center">Generate Invite</button>
            </form>

            <section className="premium-card">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><p className="eyebrow text-violet-600">Invite list</p><h2 className="text-2xl font-black">Recent invites</h2></div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">{invites.length} total</span>
              </div>
              {loading ? <div className="loading-state">Loading invites...</div> : invites.length === 0 ? <div className="empty-state">No invites yet.</div> : (
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div key={invite.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-slate-950">{invite.full_name}</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{invite.email}</p>
                          <p className="mt-1 text-xs font-black uppercase text-blue-700">{invite.status} · Code: {invite.invite_code || "N/A"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => copyText(invite.invite_link)} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">Copy link</button>
                          <button onClick={() => resend(invite.id)} className="rounded-full bg-blue-100 px-3 py-2 text-xs font-black text-blue-700">Regenerate</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

export default InviteCenter;
