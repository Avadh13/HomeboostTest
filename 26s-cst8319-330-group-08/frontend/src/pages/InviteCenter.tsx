import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type Invite = {
  id: number;
  full_name: string;
  email: string;
  status: string;
  partnership_id: number;
  invite_role?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

type InviteDelivery = Invite & {
  invite_code: string;
  invite_link: string;
};

type SubmitEventLike = { preventDefault: () => void };

function InviteCenter() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [lastDelivery, setLastDelivery] = useState<InviteDelivery | null>(null);
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
    setLastDelivery(null);
    const body = { full_name: fullName, email, partnership_id: needsPartnershipField ? partnershipId : undefined };
    const response = await fetch(`${API_BASE_URL}/invites/employee`, { method: "POST", headers, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok || data.status !== "success" || !data.delivery) {
      setNotice(data.message || "Invite could not be created");
      return;
    }
    setLastDelivery(data.delivery);
    setNotice("Invite created. Copy the link or code now; it will not be shown again in the invite list.");
    setFullName("");
    setEmail("");
    loadInvites();
  };

  const resend = async (id: number) => {
    setLastDelivery(null);
    const response = await fetch(`${API_BASE_URL}/invites/resend/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok || data.status !== "success" || !data.delivery) {
      setNotice(data.message || "Could not regenerate invite");
      return;
    }
    setLastDelivery(data.delivery);
    setNotice("Invite regenerated. Copy the new link or code now; the previous credentials no longer work.");
    loadInvites();
  };

  const revoke = async (id: number) => {
    if (!window.confirm("Revoke this pending invite? The current link and code will stop working.")) return;
    const response = await fetch(`${API_BASE_URL}/invites/revoke/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    setNotice(response.ok && data.status === "success" ? "Invite revoked." : data.message || "Could not revoke invite");
    setLastDelivery(null);
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
            <p className="mt-4 max-w-3xl text-slate-300">Generate single-use invite links or access codes. Only hashed credentials are stored by the server.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="space-y-5">
              <form onSubmit={createInvite} className="premium-card space-y-4">
                <p className="eyebrow text-blue-600">New invite</p>
                <h2 className="text-2xl font-black">Create employee invite</h2>
                <label className="grid gap-2 text-sm font-black text-slate-700">Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="form-field" /></label>
                <label className="grid gap-2 text-sm font-black text-slate-700">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="form-field" /></label>
                {needsPartnershipField && <label className="grid gap-2 text-sm font-black text-slate-700">Partnership ID<input value={partnershipId} onChange={(e) => setPartnershipId(e.target.value)} required inputMode="numeric" className="form-field" /></label>}
                {notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{notice}</div>}
                <button type="submit" className="btn-primary w-full justify-center">Generate Invite</button>
              </form>

              {lastDelivery && (
                <div className="premium-card border-emerald-200 bg-emerald-50">
                  <p className="eyebrow text-emerald-700">One-time delivery details</p>
                  <h2 className="mt-2 text-xl font-black">Copy before leaving this page</h2>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-700">{lastDelivery.invite_link}</p>
                  <p className="mt-3 text-sm font-black text-slate-900">Access code: {lastDelivery.invite_code}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => copyText(lastDelivery.invite_link)} className="btn-primary text-xs">Copy Link</button>
                    <button type="button" onClick={() => copyText(lastDelivery.invite_code)} className="btn-secondary text-xs">Copy Code</button>
                  </div>
                </div>
              )}
            </div>

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
                          <p className="mt-1 text-xs font-black uppercase text-blue-700">{invite.status} · {invite.invite_role || "employee"}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">Credentials are never displayed from stored records.</p>
                        </div>
                        {invite.status !== "registered" && (
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => resend(invite.id)} className="rounded-full bg-blue-100 px-3 py-2 text-xs font-black text-blue-700">Regenerate</button>
                            {invite.status !== "revoked" && <button type="button" onClick={() => revoke(invite.id)} className="rounded-full bg-red-100 px-3 py-2 text-xs font-black text-red-700">Revoke</button>}
                          </div>
                        )}
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
