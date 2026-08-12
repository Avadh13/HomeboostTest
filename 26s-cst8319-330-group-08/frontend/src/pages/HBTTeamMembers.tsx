import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
import { useToast } from "../components/ToastProvider";

type TeamMember = {
  id: number;
  full_name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  booking_link?: string | null;
  bio?: string | null;
  is_active: number;
  login_email?: string | null;
  login_role?: string | null;
  login_active?: number | null;
};

type ActivationDelivery = {
  email: string;
  role: string;
  activation_link: string;
  expires_in_hours: number;
};

const defaultAvatar = "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=800&q=80";

function HBTTeamMembers() {
  const toast = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activation, setActivation] = useState<ActivationDelivery | null>(null);
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bookingLink, setBookingLink] = useState("");
  const [bio, setBio] = useState("");
  const [isActive, setIsActive] = useState(1);
  const token = localStorage.getItem("token");
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadTeamMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/team-members`, { headers: authHeaders });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        toast.error(data.message || "Failed to load team members.");
        setTeamMembers([]);
        return;
      }
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load team members.");
      setTeamMembers([]);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, [token]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teamMembers.filter((member) => {
      const searchable = [member.full_name, member.email, member.login_email, member.title, member.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const lifecycleStatus = Number(member.login_active) === 1 ? "active" : "pending";
      return (!query || searchable.includes(query)) && (statusFilter === "all" || lifecycleStatus === statusFilter);
    });
  }, [search, statusFilter, teamMembers]);

  const activeMembers = teamMembers.filter((member) => Number(member.login_active) === 1).length;
  const pendingMembers = teamMembers.filter((member) => Number(member.login_active) !== 1).length;

  const resetForm = () => {
    setEditingId(null);
    setFullName("");
    setTitle("");
    setEmail("");
    setPhone("");
    setPhotoUrl("");
    setBookingLink("");
    setBio("");
    setIsActive(1);
  };

  const openCreateDrawer = () => {
    resetForm();
    setActivation(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    resetForm();
  };

  const startEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setFullName(member.full_name || "");
    setTitle(member.title || "");
    setEmail(member.email || member.login_email || "");
    setPhone(member.phone || "");
    setPhotoUrl(member.photo_url || "");
    setBookingLink(member.booking_link || "");
    setBio(member.bio || "");
    setIsActive(Number(member.login_active) === 1 ? 1 : 0);
    setDrawerOpen(true);
  };

  const copyActivationLink = async () => {
    if (!activation?.activation_link) return;
    try {
      await navigator.clipboard.writeText(activation.activation_link);
      toast.success("Activation link copied.");
    } catch {
      toast.error("Could not copy the activation link.");
    }
  };

  const saveMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.warning("Full name and email are required.");
      return;
    }

    const response = await fetch(editingId ? `${API_BASE_URL}/team-members/${editingId}` : `${API_BASE_URL}/team-members`, {
      method: editingId ? "PUT" : "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        title,
        email,
        phone,
        photo_url: photoUrl,
        booking_link: bookingLink,
        bio,
        is_active: isActive,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.message || "Failed to save team member.");
      return;
    }

    if (!editingId && data.activation) {
      setActivation(data.activation as ActivationDelivery);
      toast.success("Team member created. Share the one-time activation link.");
    } else {
      toast.success("Team member updated.");
    }
    closeDrawer();
    await loadTeamMembers();
  };

  const resendActivation = async (member: TeamMember) => {
    try {
      const response = await fetch(`${API_BASE_URL}/team-members/${member.id}/resend-activation`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.message || "Could not regenerate activation link.");
        return;
      }
      setActivation(data.activation as ActivationDelivery);
      toast.success("A new one-time activation link was generated.");
    } catch {
      toast.error("Could not regenerate activation link.");
    }
  };

  const disableMember = async (member: TeamMember) => {
    if (!confirm(`Disable ${member.full_name}'s HBT Member account?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/team-members/${member.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.message || "Failed to disable team member.");
        return;
      }
      toast.success("Team member disabled.");
      await loadTeamMembers();
    } catch {
      toast.error("Failed to disable team member.");
    }
  };

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="theme-panel">
          <Link to="/hbt/dashboard" className="text-sm font-black text-violet-200 hover:text-white">← Back to HBT Dashboard</Link>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">HBT Team Access</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Team Members</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">
                Create HBT Member profiles without assigning passwords. New accounts remain inactive until the member uses their one-time activation link and chooses their own password.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-3xl bg-white/10 p-3 backdrop-blur">
              <div><p className="text-2xl font-black">{teamMembers.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Total</p></div>
              <div><p className="text-2xl font-black">{activeMembers}</p><p className="text-[11px] font-bold uppercase text-violet-100">Active</p></div>
              <div><p className="text-2xl font-black">{pendingMembers}</p><p className="text-[11px] font-bold uppercase text-violet-100">Pending</p></div>
            </div>
          </div>
        </header>

        {activation && (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-emerald-900">One-Time Activation Link</h2>
                <p className="mt-2 text-sm text-emerald-700">Share this link only with {activation.email}. It expires in {activation.expires_in_hours} hours and is not stored in plaintext.</p>
                <p className="mt-3 break-all rounded-2xl bg-white p-4 font-mono text-xs font-bold text-slate-700">{activation.activation_link}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={copyActivationLink} className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-800">Copy Link</button>
                <button type="button" onClick={() => setActivation(null)} className="rounded-full border border-emerald-300 px-5 py-2.5 text-sm font-black text-emerald-800 hover:bg-emerald-100">Hide</button>
              </div>
            </div>
          </section>
        )}

        <section className="premium-card p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-center">
            <input className="form-field" placeholder="Search name, title, email, phone..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className="form-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="pending">Pending / Disabled</option>
            </select>
            <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Team Member</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => {
            const active = Number(member.login_active) === 1;
            return (
              <article key={member.id} className="premium-card overflow-hidden p-0">
                <div className="h-40 bg-slate-100">
                  <img src={member.photo_url || defaultAvatar} alt={member.full_name} className="h-full w-full object-cover" />
                </div>
                <div className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{active ? "Active" : "Pending / Disabled"}</span>
                    {member.login_role && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{member.login_role}</span>}
                  </div>
                  <h2 className="text-xl font-black text-slate-950">{member.full_name}</h2>
                  <p className="mt-1 font-bold text-violet-700">{member.title || "HBT Team Member"}</p>
                  <p className="mt-2 text-sm text-slate-500">{member.email || member.login_email || "No email"}{member.phone && ` | ${member.phone}`}</p>
                  {member.bio && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{member.bio}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {member.booking_link && <a href={member.booking_link} target="_blank" rel="noreferrer" className="btn-secondary">Booking Link</a>}
                    {!active && <button type="button" onClick={() => resendActivation(member)} className="btn-secondary">Resend Activation</button>}
                    <button type="button" onClick={() => startEdit(member)} className="btn-primary">Edit</button>
                    <button type="button" onClick={() => disableMember(member)} className="btn-danger">Disable</button>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredMembers.length === 0 && <div className="premium-card p-8 text-center text-slate-500 md:col-span-2 xl:col-span-3">No team members found.</div>}
        </section>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[80vw]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">HBT Member profile</p>
                <h2 className="text-2xl font-black">{editingId ? "Edit Team Member" : "Add Team Member"}</h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <form onSubmit={saveMember} className="flex-1 overflow-y-auto p-5 md:p-7">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Full name</span><input className="form-field w-full" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
                <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Email</span><input type="email" className="form-field w-full" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Title</span><input className="form-field w-full" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Phone</span><input className="form-field w-full" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
                <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Photo URL</span><input className="form-field w-full" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} /></label>
                <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Booking link</span><input className="form-field w-full" value={bookingLink} onChange={(event) => setBookingLink(event.target.value)} /></label>
                <label className="block md:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">Bio</span><textarea className="form-field min-h-32 w-full" value={bio} onChange={(event) => setBio(event.target.value)} /></label>
                {editingId && (
                  <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Account state</span><select className="form-field w-full" value={isActive} onChange={(event) => setIsActive(Number(event.target.value))}><option value={1}>Keep active when already activated</option><option value={0}>Disable</option></select></label>
                )}
              </div>

              {!editingId && (
                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
                  No password is collected here. The new HBT Member will remain inactive until they open the generated one-time activation link and choose their own password.
                </div>
              )}

              <div className="mt-7 flex justify-end gap-3">
                <button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create & Generate Activation"}</button>
              </div>
            </form>
          </aside>
        </div>
      )}

      <ChatWidget />
    </main>
  );
}

export default HBTTeamMembers;
