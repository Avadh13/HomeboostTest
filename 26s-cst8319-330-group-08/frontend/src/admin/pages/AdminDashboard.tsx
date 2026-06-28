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
  const adminCount = users.filter((user) => user.role === "admin" || user.role === "super_admin").length;
  const activePartnerships = partnerships.filter((partnership) => partnership.status === "active").length;
  const maxContentValue = Math.max(totalResources, totalPricing, totalFAQs, totalQuizzes, totalMessages, 1);

  const contentBars = [
    { label: "Resources", value: totalResources },
    { label: "Pricing", value: totalPricing },
    { label: "FAQs", value: totalFAQs },
    { label: "Quizzes", value: totalQuizzes },
    { label: "Messages", value: totalMessages },
  ];

  const roleBars = [
    { label: "Employees", value: employeeCount },
    { label: "HBT Users", value: hbtCount },
    { label: "Admins", value: adminCount },
  ];

  const recentUsers = useMemo(() => users.slice(0, 5), [users]);
  const recentMessages = useMemo(() => messages.slice(0, 4), [messages]);

  const statCards = [
    { label: "Total Users", value: totalUsers, helper: `${activeUsers} active / ${disabledUsers} disabled`, tone: "from-blue-600 to-violet-600" },
    { label: "HBT Teams", value: totalHBTs, helper: "Home Buying Team accounts", tone: "from-indigo-600 to-violet-600" },
    { label: "Partnerships", value: partnerships.length, helper: `${activePartnerships} active company portals`, tone: "from-violet-600 to-fuchsia-600" },
    { label: "Unread Messages", value: unreadMessages, helper: `${totalMessages} total contact messages`, tone: "from-red-500 to-rose-600" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-5">
        <section className="theme-panel relative overflow-hidden">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-400/30 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Client Control Panel</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Admin Dashboard</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">
                Monitor users, employer partnerships, HBT teams, CMS content, messages, and client-facing activity from one command center.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/partnerships" className="rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">Add Partnership</Link>
              <Link to="/admin/hbts" className="rounded-full border border-white/30 px-4 py-2 text-xs font-black text-white hover:bg-white/10">Add HBT Team</Link>
              <Link to="/admin/builder" className="rounded-full border border-white/30 px-4 py-2 text-xs font-black text-white hover:bg-white/10">Builder Mode</Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="premium-card p-8 text-center font-bold text-slate-500">Loading dashboard stats...</div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <div key={card.label} className="premium-card overflow-hidden p-0">
                  <div className={`h-1.5 bg-gradient-to-r ${card.tone}`} />
                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                    <h2 className="mt-2 text-4xl font-black text-slate-950">{card.value}</h2>
                    <p className="mt-2 text-sm font-bold text-slate-500">{card.helper}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="premium-card">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Access mix</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Users by Role</h2>
                  </div>
                  <Link to="/admin/users" className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Open Users</Link>
                </div>
                <div className="space-y-4">
                  {roleBars.map((item) => {
                    const width = totalUsers > 0 ? Math.max((item.value / totalUsers) * 100, 5) : 5;
                    return (
                      <div key={item.label}>
                        <div className="mb-1.5 flex justify-between text-sm font-bold text-slate-700"><span>{item.label}</span><span>{item.value}</span></div>
                        <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" style={{ width: `${width}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="premium-card">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">CMS activity</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Content Overview</h2>
                  </div>
                  <Link to="/admin/resources" className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Open CMS</Link>
                </div>
                <div className="space-y-4">
                  {contentBars.map((item) => {
                    const width = Math.max((item.value / maxContentValue) * 100, 5);
                    return (
                      <div key={item.label}>
                        <div className="mb-1.5 flex justify-between text-sm font-bold text-slate-700"><span>{item.label}</span><span>{item.value}</span></div>
                        <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500" style={{ width: `${width}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="premium-card">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Latest activity</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Recent Users</h2>
                  </div>
                  <Link to="/admin/users" className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">View All</Link>
                </div>
                <div className="space-y-3">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white">{(user.full_name || user.email || "U").charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="font-black text-slate-950">{user.full_name || "Unnamed user"}</p>
                          <p className="text-xs font-semibold text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{user.role.replace("_", " ")}</span>
                        {user.hbt_name && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{user.hbt_name}</span>}
                        {user.employer_name && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{user.employer_name}</span>}
                      </div>
                    </div>
                  ))}
                  {recentUsers.length === 0 && <p className="text-sm font-bold text-slate-500">No users found.</p>}
                </div>
              </div>

              <div className="premium-card">
                <p className="eyebrow">Quick Actions</p>
                <div className="mt-4 grid gap-3">
                  <Link to="/admin/partnerships" className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-violet-500/20">Create Employer Partnership</Link>
                  <Link to="/admin/hbts" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-violet-700">Add Home Buying Team</Link>
                  <Link to="/admin/resources" className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Manage Resources</Link>
                  <Link to="/admin/contact-messages" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100">Review Messages</Link>
                </div>
              </div>
            </section>

            <section className="premium-card">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Inbox</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Recent Contact Messages</h2>
                </div>
                <Link to="/admin/contact-messages" className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Open Inbox</Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {recentMessages.map((message) => (
                  <div key={message.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-black text-slate-950">{message.name || "Website Visitor"}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${Number(message.is_read) === 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{Number(message.is_read) === 0 ? "Unread" : "Read"}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{message.email || "No email"}</p>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-700">{message.message || "No message preview available."}</p>
                  </div>
                ))}
                {recentMessages.length === 0 && <p className="text-sm font-bold text-slate-500">No messages found.</p>}
              </div>
            </section>
          </>
        )}
      </div>
      <ChatWidget />
    </AdminLayout>
  );
}

export default AdminDashboard;
