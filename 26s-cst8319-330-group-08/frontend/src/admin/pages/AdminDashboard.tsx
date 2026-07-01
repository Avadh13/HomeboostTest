import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import ChatWidget from "../../components/ChatWidget";
import { useToast } from "../../components/ToastProvider";

type ContactMessage = {
  id: number;
  is_read: number;
  name?: string;
  email?: string;
  message?: string;
  created_at?: string;
};

type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: number;
  hbt_name?: string | null;
  employer_name?: string | null;
  created_at?: string;
};

type Partnership = {
  id: number;
  employer_name: string;
  hbt_name: string;
  slug: string;
  status: string;
};

type MetricCardProps = {
  label: string;
  value: number;
  helper: string;
  accent: string;
  glow: string;
  href: string;
};

const roleLabel = (role?: string) => (role || "user").replace(/_/g, " ");
const initials = (name?: string, fallback = "U") => (name || fallback).trim().charAt(0).toUpperCase() || fallback;

function MetricCard({ label, value, helper, accent, glow, href }: MetricCardProps) {
  return (
    <Link
      to={href}
      className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-slate-950/20 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.09]"
    >
      <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full ${glow} blur-2xl transition group-hover:scale-125`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <span className={`h-3 w-3 rounded-full ${accent} shadow-lg`} />
        </div>
        <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">{value}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-400">{helper}</p>
      </div>
    </Link>
  );
}

function AdminDashboard() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [totalResources, setTotalResources] = useState(0);
  const [totalPricing, setTotalPricing] = useState(0);
  const [totalFAQs, setTotalFAQs] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [totalHBTs, setTotalHBTs] = useState(0);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE_URL}/users`, { headers }).then((res) => res.json()),
      fetch(`${API_BASE_URL}/resources`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/pricing`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/faqs`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/contact`, { headers }).then((res) => res.json()),
      fetch(`${API_BASE_URL}/quizzes`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/hbts`, { headers }).then((res) => res.json()),
      fetch(`${API_BASE_URL}/admin-partnerships`, { headers }).then((res) => res.json()),
    ])
      .then(([usersData, resources, pricing, faqs, messagesData, quizzes, hbts, partnershipsData]) => {
        setUsers(Array.isArray(usersData) ? usersData : []);
        setTotalResources(Array.isArray(resources) ? resources.length : 0);
        setTotalPricing(Array.isArray(pricing) ? pricing.length : 0);
        setTotalFAQs(Array.isArray(faqs) ? faqs.length : 0);
        setMessages(Array.isArray(messagesData) ? messagesData : []);
        setTotalQuizzes(Array.isArray(quizzes) ? quizzes.length : 0);
        setTotalHBTs(Array.isArray(hbts) ? hbts.length : 0);
        setPartnerships(Array.isArray(partnershipsData) ? partnershipsData : []);
      })
      .catch((error) => {
        console.error("Dashboard load error:", error);
        toast.error("Failed to load dashboard stats.");
      })
      .finally(() => setLoading(false));
  }, [token, toast]);

  const totalUsers = users.length;
  const totalMessages = messages.length;
  const unreadMessages = messages.filter((message) => Number(message.is_read) === 0).length;
  const activeUsers = users.filter((user) => Number(user.is_active) === 1).length;
  const disabledUsers = users.filter((user) => Number(user.is_active) === 0).length;
  const employeeCount = users.filter((user) => user.role === "employee").length;
  const hbtCount = users.filter((user) => user.role === "hbt_admin" || user.role === "hbt_member").length;
  const companyCount = users.filter((user) => user.role === "company_admin" || user.role === "company").length;
  const adminCount = users.filter((user) => user.role === "admin" || user.role === "super_admin").length;
  const activePartnerships = partnerships.filter((partnership) => partnership.status === "active").length;
  const maxContentValue = Math.max(totalResources, totalPricing, totalFAQs, totalQuizzes, totalMessages, 1);
  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const partnershipRate = partnerships.length > 0 ? Math.round((activePartnerships / partnerships.length) * 100) : 0;

  const contentBars = [
    { label: "Resources", value: totalResources, color: "from-sky-400 to-blue-500" },
    { label: "Pricing", value: totalPricing, color: "from-violet-400 to-purple-500" },
    { label: "FAQs", value: totalFAQs, color: "from-amber-300 to-orange-500" },
    { label: "Quizzes", value: totalQuizzes, color: "from-emerald-300 to-green-500" },
    { label: "Contact", value: totalMessages, color: "from-pink-400 to-rose-500" },
  ];

  const roleBars = [
    { label: "Employees", value: employeeCount, color: "from-cyan-400 to-blue-500" },
    { label: "HBT Users", value: hbtCount, color: "from-violet-400 to-fuchsia-500" },
    { label: "Companies", value: companyCount, color: "from-emerald-300 to-teal-500" },
    { label: "Admins", value: adminCount, color: "from-amber-300 to-orange-500" },
  ];

  const recentUsers = useMemo(() => users.slice(0, 5), [users]);
  const recentMessages = useMemo(() => messages.slice(0, 4), [messages]);
  const latestPartnerships = useMemo(() => partnerships.slice(0, 4), [partnerships]);

  return (
    <AdminLayout title="Dashboard">
      <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[#0b1220] text-white shadow-2xl shadow-slate-950/30">
        <div className="relative overflow-hidden p-5 md:p-7">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <section className="relative grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-300 ring-1 ring-sky-400/20">HomeBoost Test</span>
                <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-violet-200 ring-1 ring-violet-400/20">Theme 2</span>
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">Modern admin analytics dashboard</h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 md:text-base">
                Track users, HBT teams, partnerships, content, quizzes, and contact requests from one dark control center.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/admin/partnerships" className="rounded-full bg-sky-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-sky-400/20 hover:bg-sky-300">Add Partnership</Link>
                <Link to="/admin/hbts" className="rounded-full bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15">Add HBT Team</Link>
                <Link to="/admin/messages" className="rounded-full bg-violet-500/20 px-5 py-3 text-sm font-black text-violet-100 ring-1 ring-violet-400/25 hover:bg-violet-500/30">Open Messages</Link>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">System Health</p>
                    <h2 className="mt-2 text-3xl font-black text-white">{activeRate}%</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-400">{activeUsers} active users</p>
                  </div>
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-[conic-gradient(#22d3ee_var(--progress),rgba(255,255,255,0.10)_0)]" style={{ "--progress": `${activeRate * 3.6}deg` } as React.CSSProperties}>
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-[#0b1220] text-lg font-black text-sky-300">{activeRate}%</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Active Portals</p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-4xl font-black text-white">{activePartnerships}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-400">of {partnerships.length} partnerships</p>
                  </div>
                  <span className="rounded-2xl bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-300 ring-1 ring-emerald-400/20">{partnershipRate}% active</span>
                </div>
              </div>
            </div>
          </section>

          {loading ? (
            <div className="relative mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-8 text-center font-bold text-slate-300">Loading dashboard stats...</div>
          ) : (
            <>
              <section className="relative mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Total Users" value={totalUsers} helper={`${activeUsers} active / ${disabledUsers} disabled`} accent="bg-sky-400" glow="bg-sky-400/30" href="/admin/users" />
                <MetricCard label="HBT Teams" value={totalHBTs} helper="Advisor teams onboarded" accent="bg-violet-400" glow="bg-violet-400/30" href="/admin/hbts" />
                <MetricCard label="Partnerships" value={partnerships.length} helper={`${activePartnerships} active company portals`} accent="bg-emerald-400" glow="bg-emerald-400/30" href="/admin/partnerships" />
                <MetricCard label="Unread" value={unreadMessages} helper={`${totalMessages} total contact forms`} accent="bg-pink-400" glow="bg-pink-400/30" href="/admin/contact-messages" />
              </section>

              <section className="relative mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl md:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Role Distribution</p>
                      <h2 className="mt-1 text-2xl font-black text-white">Access mix</h2>
                    </div>
                    <Link to="/admin/users" className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/15">Open Users</Link>
                  </div>

                  <div className="space-y-4">
                    {roleBars.map((item) => {
                      const width = totalUsers > 0 ? Math.max((item.value / totalUsers) * 100, 6) : 6;
                      return (
                        <div key={item.label}>
                          <div className="mb-2 flex justify-between text-sm font-bold text-slate-300"><span>{item.label}</span><span>{item.value}</span></div>
                          <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className={`h-3 rounded-full bg-gradient-to-r ${item.color}`} style={{ width: `${width}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl md:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">CMS Activity</p>
                      <h2 className="mt-1 text-2xl font-black text-white">Content overview</h2>
                    </div>
                    <Link to="/admin/resources" className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/15">Open CMS</Link>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {contentBars.map((item) => {
                      const width = Math.max((item.value / maxContentValue) * 100, 6);
                      return (
                        <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                          <div className="flex items-center justify-between text-sm font-bold text-slate-300"><span>{item.label}</span><span className="text-white">{item.value}</span></div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-2 rounded-full bg-gradient-to-r ${item.color}`} style={{ width: `${width}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="relative mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl md:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Latest Activity</p>
                      <h2 className="mt-1 text-2xl font-black text-white">Recent users</h2>
                    </div>
                    <Link to="/admin/users" className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/15">View All</Link>
                  </div>

                  <div className="space-y-3">
                    {recentUsers.map((user) => (
                      <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-400/15 text-sm font-black text-sky-300 ring-1 ring-sky-400/20">{initials(user.full_name || user.email)}</div>
                          <div className="min-w-0">
                            <p className="truncate font-black text-white">{user.full_name || "Unnamed user"}</p>
                            <p className="truncate text-xs font-semibold text-slate-400">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs font-black capitalize text-violet-200 ring-1 ring-violet-400/20">{roleLabel(user.role)}</span>
                          {user.hbt_name && <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-200 ring-1 ring-sky-400/20">{user.hbt_name}</span>}
                          {user.employer_name && <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200 ring-1 ring-emerald-400/20">{user.employer_name}</span>}
                        </div>
                      </div>
                    ))}
                    {recentUsers.length === 0 && <p className="text-sm font-bold text-slate-400">No users found.</p>}
                  </div>
                </div>

                <div className="grid gap-5">
                  <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl md:p-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-300">Quick Actions</p>
                    <div className="mt-4 grid gap-3">
                      <Link to="/admin/partnerships" className="rounded-2xl bg-sky-400 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-sky-400/20 hover:bg-sky-300">Create Employer Partnership</Link>
                      <Link to="/admin/hbts" className="rounded-2xl bg-violet-500/20 px-4 py-3 text-sm font-black text-violet-100 ring-1 ring-violet-400/25 hover:bg-violet-500/30">Add Home Buying Team</Link>
                      <Link to="/admin/builder" className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-slate-100 ring-1 ring-white/10 hover:bg-white/15">Open Builder Mode</Link>
                      <Link to="/admin/contact-messages" className="rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-black text-rose-200 ring-1 ring-rose-400/20 hover:bg-rose-500/20">Review Contact Forms</Link>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl md:p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Partnerships</p>
                        <h2 className="mt-1 text-xl font-black text-white">Latest portals</h2>
                      </div>
                      <Link to="/admin/partnerships" className="text-xs font-black text-sky-300 hover:text-sky-200">Open</Link>
                    </div>
                    <div className="space-y-3">
                      {latestPartnerships.map((partnership) => (
                        <div key={partnership.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-white">{partnership.employer_name}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-400">{partnership.hbt_name} · /{partnership.slug}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${partnership.status === "active" ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20" : "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20"}`}>{partnership.status}</span>
                          </div>
                        </div>
                      ))}
                      {latestPartnerships.length === 0 && <p className="text-sm font-bold text-slate-400">No partnerships found.</p>}
                    </div>
                  </div>
                </div>
              </section>

              <section className="relative mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl md:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">Inbox</p>
                    <h2 className="mt-1 text-2xl font-black text-white">Recent contact messages</h2>
                  </div>
                  <Link to="/admin/contact-messages" className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/15">Open Inbox</Link>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {recentMessages.map((message) => (
                    <div key={message.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="font-black text-white">{message.name || "Website Visitor"}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${Number(message.is_read) === 0 ? "bg-rose-400/10 text-rose-300 ring-1 ring-rose-400/20" : "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20"}`}>{Number(message.is_read) === 0 ? "Unread" : "Read"}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-400">{message.email || "No email"}</p>
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-300">{message.message || "No message preview available."}</p>
                    </div>
                  ))}
                  {recentMessages.length === 0 && <p className="text-sm font-bold text-slate-400">No messages found.</p>}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
      <ChatWidget />
    </AdminLayout>
  );
}

export default AdminDashboard;
