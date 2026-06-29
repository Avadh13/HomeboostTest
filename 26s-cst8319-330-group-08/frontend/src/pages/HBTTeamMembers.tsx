import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
import { useToast } from "../components/ToastProvider";

type TeamMember = {
  id: number;
  full_name: string;
  title: string;
  email: string;
  phone: string;
  photo_url: string;
  booking_link: string;
  bio: string;
  is_active: number;
  login_email?: string;
  login_role?: string;
  login_active?: number;
};

type CreatedLogin = {
  email: string;
  temporary_password: string;
  role: string;
};

const defaultAvatar = "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=800&q=80";

function HBTTeamMembers() {
  const toast = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bookingLink, setBookingLink] = useState("");
  const [bio, setBio] = useState("");
  const [isActive, setIsActive] = useState(1);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [createdLogin, setCreatedLogin] = useState<CreatedLogin | null>(null);

  const token = localStorage.getItem("token");

  const loadTeamMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/team-members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to load team members.");
        setTeamMembers([]);
        return;
      }

      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load team members:", error);
      toast.error("Failed to load team members.");
      setTeamMembers([]);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teamMembers.filter((member) => {
      const matchesSearch =
        !query ||
        member.full_name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.login_email?.toLowerCase().includes(query) ||
        member.title?.toLowerCase().includes(query) ||
        member.phone?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || String(Number(member.is_active)) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, teamMembers]);

  const activeMembers = teamMembers.filter((member) => Number(member.is_active) === 1).length;
  const loginMembers = teamMembers.filter((member) => member.login_email || member.login_role).length;

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
    setPassword("");
    setConfirmPassword("");
  };

  const openCreateDrawer = () => {
    resetForm();
    setCreatedLogin(null);
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
    setIsActive(Number(member.is_active) === 1 ? 1 : 0);
    setPassword("");
    setConfirmPassword("");
    setCreatedLogin(null);
    setDrawerOpen(true);
  };

  const copyPassword = async () => {
    if (!createdLogin?.temporary_password) return;
    await navigator.clipboard.writeText(createdLogin.temporary_password);
    toast.success("Password copied.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.warning("Full name is required.");
      return;
    }

    if (!editingId) {
      if (!email.trim()) {
        toast.warning("Email is required because team member needs login access.");
        return;
      }

      if (!password.trim()) {
        toast.warning("Please set a password for this team member.");
        return;
      }
    }

    if (password.trim()) {
      if (password.length < 6) {
        toast.warning("Password should be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        toast.warning("Password and confirm password do not match.");
        return;
      }
    }

    const url = editingId ? `${API_BASE_URL}/team-members/${editingId}` : `${API_BASE_URL}/team-members`;
    const method = editingId ? "PUT" : "POST";

    const bodyData: {
      full_name: string;
      title: string;
      email: string;
      phone: string;
      photo_url: string;
      booking_link: string;
      bio: string;
      is_active: number;
      password?: string;
    } = {
      full_name: fullName,
      title,
      email,
      phone,
      photo_url: photoUrl,
      booking_link: bookingLink,
      bio,
      is_active: isActive,
    };

    if (password.trim()) bodyData.password = password;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to save team member.");
        return;
      }

      if (!editingId && data.login) {
        setCreatedLogin(data.login);
        toast.success("Team member created with login access.");
      } else if (editingId && password.trim()) {
        toast.success("Team member updated and password changed.");
      } else {
        toast.success(editingId ? "Team member updated." : "Team member created.");
      }

      closeDrawer();
      loadTeamMembers();
    } catch (error) {
      console.error("Failed to save team member:", error);
      toast.error("Failed to save team member.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Disable this team member login and profile?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/team-members/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to disable team member.");
        return;
      }

      toast.success("Team member disabled.");
      loadTeamMembers();
    } catch (error) {
      console.error("Failed to disable team member:", error);
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
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">Create advisor profiles and login accounts so HBT members can follow up with employees and manage appointments.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-3xl bg-white/10 p-3 backdrop-blur">
              <div><p className="text-2xl font-black">{teamMembers.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Total</p></div>
              <div><p className="text-2xl font-black">{activeMembers}</p><p className="text-[11px] font-bold uppercase text-violet-100">Active</p></div>
              <div><p className="text-2xl font-black">{loginMembers}</p><p className="text-[11px] font-bold uppercase text-violet-100">Logins</p></div>
            </div>
          </div>
        </header>

        {createdLogin && (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-emerald-900">Team Member Login Created</h2>
                <p className="mt-2 text-sm text-emerald-700">Share these credentials with the team member. Password is shown only now.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={copyPassword} className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-800">Copy Password</button>
                <button onClick={() => setCreatedLogin(null)} className="rounded-full border border-emerald-300 px-5 py-2.5 text-sm font-black text-emerald-800 hover:bg-emerald-100">Hide</button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Email</p><p className="mt-1 font-black text-slate-950">{createdLogin.email}</p></div>
              <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Password</p><p className="mt-1 font-mono font-black text-blue-700">{createdLogin.temporary_password}</p></div>
              <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Role</p><p className="mt-1 font-black text-slate-950">{createdLogin.role}</p></div>
            </div>
          </section>
        )}

        <section className="premium-card p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-center">
            <input className="form-field" placeholder="Search name, title, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All status</option>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </select>
            <button onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Team Member</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => (
            <article key={member.id} className="premium-card overflow-hidden p-0">
              <div className="h-40 bg-slate-100">
                <img src={member.photo_url || defaultAvatar} alt={member.full_name} className="h-full w-full object-cover" />
              </div>
              <div className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${Number(member.is_active) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{Number(member.is_active) === 1 ? "Active" : "Disabled"}</span>
                  {member.login_role && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{member.login_role}</span>}
                </div>
                <h2 className="text-xl font-black text-slate-950">{member.full_name}</h2>
                <p className="mt-1 font-bold text-violet-700">{member.title || "HBT Team Member"}</p>
                <p className="mt-2 text-sm text-slate-500">{member.email || member.login_email || "No email"}{member.phone && ` | ${member.phone}`}</p>
                {member.bio && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{member.bio}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {member.booking_link && <a href={member.booking_link} target="_blank" rel="noreferrer" className="btn-secondary">Booking Link</a>}
                  <button onClick={() => startEdit(member)} className="btn-primary">Edit</button>
                  <button onClick={() => handleDelete(member.id)} className="btn-danger">Disable</button>
                </div>
              </div>
            </article>
          ))}

          {filteredMembers.length === 0 && (
            <div className="premium-card p-8 text-center text-slate-500 md:col-span-2 xl:col-span-3">No team members found.</div>
          )}
        </section>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[86vw] xl:w-[980px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Advisor profile editor</p>
                <h2 className="text-2xl font-black">{editingId ? "Edit Team Member" : "Add Team Member"}</h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.82fr]">
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Full Name</span><input className="form-field" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Title / Role</span><input className="form-field" placeholder="Mortgage Advisor" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Login Email</span><input className="form-field" placeholder="email@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={!editingId} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Phone</span><input className="form-field" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">{editingId ? "New Login Password" : "Set Login Password"}</span><input className="form-field" placeholder={editingId ? "Optional" : "Required"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editingId} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Confirm Password</span><input className="form-field" placeholder={editingId ? "Optional" : "Required"} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required={!editingId} /></label>
                </div>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Photo URL</span><input className="form-field" placeholder="https://..." value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Booking Link</span><input className="form-field" placeholder="https://calendly.com/..." value={bookingLink} onChange={(e) => setBookingLink(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Bio</span><textarea className="form-field min-h-28" placeholder="Advisor bio" value={bio} onChange={(e) => setBio(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}><option value={1}>Active</option><option value={0}>Disabled</option></select></label>
                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <button className="btn-primary">{editingId ? "Update Team Member" : "Create Login"}</button>
                  <button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button>
                </div>
              </form>

              <section className="border-l border-slate-200 bg-white p-5">
                <p className="eyebrow">Live preview</p>
                <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
                  <div className="h-56 bg-slate-100"><img src={photoUrl || defaultAvatar} alt="Advisor preview" className="h-full w-full object-cover" /></div>
                  <div className="p-5">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{isActive ? "Active" : "Disabled"}</span>
                    <h3 className="mt-3 text-2xl font-black text-slate-950">{fullName || "Advisor name"}</h3>
                    <p className="mt-1 font-bold text-violet-700">{title || "Advisor title"}</p>
                    <p className="mt-2 text-sm text-slate-500">{email || "email@example.com"}{phone && ` | ${phone}`}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{bio || "Advisor bio preview will appear here."}</p>
                    {bookingLink && <p className="mt-4 font-black text-violet-700">Booking link ready →</p>}
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
      <ChatWidget />
    </main>
  );
}

export default HBTTeamMembers;
