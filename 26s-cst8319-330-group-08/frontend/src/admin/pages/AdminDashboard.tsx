import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../../api/api";
import { useToast } from "../../components/ToastProvider";
import AdminLayout from "../components/AdminLayout";

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

type EmployerApproval = {
  id: number;
  requested_company_name?: string;
  approval_status?: string;
  requested_at?: string;
};

type MetricCardProps = {
  label: string;
  value: number | string;
  helper: string;
  href: string;
};

type ContentStatProps = {
  label: string;
  value: number;
  href: string;
};

const roleLabel = (role?: string) => (role || "user").replace(/_/g, " ");
const initials = (name?: string, fallback = "U") =>
  (name || fallback).trim().charAt(0).toUpperCase() || fallback;

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const asArray = <T,>(value: unknown, property?: string): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (property && value && typeof value === "object") {
    const nested = (value as Record<string, unknown>)[property];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
};

function MetricCard({ label, value, helper, href }: MetricCardProps) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{helper}</p>
        </div>
        <span className="mt-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-50" />
      </div>
    </Link>
  );
}

function ContentStat({ label, value, href }: ContentStatProps) {
  return (
    <Link
      to={href}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <span className="rounded-lg bg-white px-2.5 py-1 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200">
        {value}
      </span>
    </Link>
  );
}

function AdminDashboard() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [approvals, setApprovals] = useState<EmployerApproval[]>([]);
  const [totalResources, setTotalResources] = useState(0);
  const [totalPricing, setTotalPricing] = useState(0);
  const [totalFAQs, setTotalFAQs] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [totalHBTs, setTotalHBTs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failedSources, setFailedSources] = useState<string[]>([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const sources = [
        ["users", `${API_BASE_URL}/users`, true],
        ["resources", `${API_BASE_URL}/resources`, true],
        ["pricing", `${API_BASE_URL}/pricing`, false],
        ["faqs", `${API_BASE_URL}/faqs`, false],
        ["contact", `${API_BASE_URL}/contact`, true],
        ["quizzes", `${API_BASE_URL}/quizzes`, true],
        ["hbts", `${API_BASE_URL}/hbts`, true],
        ["partnerships", `${API_BASE_URL}/admin-partnerships`, true],
        ["approvals", `${API_BASE_URL}/employer-approval/requests`, true],
      ] as const;

      const results = await Promise.allSettled(
        sources.map(async ([name, url, needsAuth]) => {
          const response = await fetch(url, needsAuth ? { headers } : undefined);
          if (!response.ok) {
            throw new Error(`${name}:${response.status}`);
          }
          return { name, data: await response.json() };
        }),
      );

      if (cancelled) return;

      const failures: string[] = [];
      results.forEach((result, index) => {
        const sourceName = sources[index][0];
        if (result.status === "rejected") {
          failures.push(sourceName);
          return;
        }

        const { data } = result.value;
        switch (sourceName) {
          case "users":
            setUsers(asArray<User>(data, "users"));
            break;
          case "resources":
            setTotalResources(asArray(data, "resources").length);
            break;
          case "pricing":
            setTotalPricing(asArray(data, "pricing").length);
            break;
          case "faqs":
            setTotalFAQs(asArray(data, "faqs").length);
            break;
          case "contact":
            setMessages(asArray<ContactMessage>(data, "messages"));
            break;
          case "quizzes":
            setTotalQuizzes(asArray(data, "quizzes").length);
            break;
          case "hbts":
            setTotalHBTs(asArray(data, "hbts").length);
            break;
          case "partnerships":
            setPartnerships(asArray<Partnership>(data, "partnerships"));
            break;
          case "approvals":
            setApprovals(asArray<EmployerApproval>(data, "requests"));
            break;
        }
      });

      setFailedSources(failures);
      if (failures.length > 0) {
        toast.error("Some dashboard data could not be loaded.");
      }
      setLoading(false);
    };

    loadDashboard().catch(() => {
      if (!cancelled) {
        setFailedSources(["dashboard"]);
        setLoading(false);
        toast.error("Failed to load dashboard data.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token, toast]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => Number(user.is_active) === 1).length;
  const disabledUsers = users.filter((user) => Number(user.is_active) === 0).length;
  const employeeCount = users.filter((user) => user.role === "employee").length;
  const hbtCount = users.filter((user) => user.role === "hbt_admin" || user.role === "hbt_member").length;
  const companyCount = users.filter((user) => user.role === "company_admin" || user.role === "company").length;
  const adminCount = users.filter((user) => user.role === "admin" || user.role === "super_admin").length;
  const unreadMessages = messages.filter((message) => Number(message.is_read) === 0).length;
  const activePartnerships = partnerships.filter((partnership) => partnership.status === "active").length;
  const pendingApprovals = approvals.filter(
    (approval) => approval.approval_status === "pending" || approval.approval_status === "needs_info",
  ).length;
  const activeUserRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const activePartnershipRate = partnerships.length > 0
    ? Math.round((activePartnerships / partnerships.length) * 100)
    : 0;

  const recentUsers = useMemo(
    () => [...users]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5),
    [users],
  );

  const recentMessages = useMemo(
    () => [...messages]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 4),
    [messages],
  );

  const latestPartnerships = useMemo(
    () => [...partnerships].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5),
    [partnerships],
  );

  const roleBreakdown = [
    { label: "Employees", value: employeeCount },
    { label: "HBT users", value: hbtCount },
    { label: "Company managers", value: companyCount },
    { label: "Admins", value: adminCount },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Platform overview</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Employee Benefit Program administration
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 md:text-base">
                Live operational data for users, Home Buying Teams, employer partnerships, approvals, content, and contact requests.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/admin/employer-approvals"
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
              >
                Review employer approvals
              </Link>
              <Link
                to="/admin/hbts"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Manage HBT teams
              </Link>
              <Link
                to="/admin/contact-messages"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Open contact forms
              </Link>
            </div>
          </div>
        </section>

        {failedSources.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-900">
            Some live dashboard sources are temporarily unavailable: {failedSources.join(", ")}. Other cards continue to show the data that loaded successfully.
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500 shadow-sm">
            Loading live dashboard data...
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total users"
                value={totalUsers}
                helper={`${activeUsers} active · ${disabledUsers} disabled`}
                href="/admin/users"
              />
              <MetricCard
                label="HBT teams"
                value={totalHBTs}
                helper="Home Buying Teams onboarded"
                href="/admin/hbts"
              />
              <MetricCard
                label="Partnerships"
                value={partnerships.length}
                helper={`${activePartnerships} active employer portals`}
                href="/admin/partnerships"
              />
              <MetricCard
                label="Pending approvals"
                value={pendingApprovals}
                helper={`${unreadMessages} unread contact forms`}
                href="/admin/employer-approvals"
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Active user rate</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-black tracking-tight text-slate-950">{activeUserRate}%</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{activeUsers} of {totalUsers} accounts active</p>
                  </div>
                  <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">Account status</span>
                </div>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${activeUserRate}%` }} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Active partnerships</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-black tracking-tight text-slate-950">{activePartnerships}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">of {partnerships.length} employer portals</p>
                  </div>
                  <span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">{activePartnershipRate}% active</span>
                </div>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${activePartnershipRate}%` }} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Role distribution</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">Current accounts</h3>
                  </div>
                  <Link to="/admin/users" className="text-sm font-black text-blue-600 hover:text-blue-700">Manage</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {roleBreakdown.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                      <span className="text-sm font-black text-slate-950">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Users</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">Recent accounts</h3>
                  </div>
                  <Link to="/admin/users" className="text-sm font-black text-blue-600 hover:text-blue-700">View all</Link>
                </div>

                <div className="mt-5 divide-y divide-slate-100">
                  {recentUsers.length === 0 ? (
                    <p className="py-8 text-center text-sm font-semibold text-slate-500">No users found.</p>
                  ) : recentUsers.map((user) => (
                    <div key={user.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
                          {initials(user.full_name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">{user.full_name}</p>
                          <p className="truncate text-xs font-semibold text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black capitalize text-slate-600">
                          {roleLabel(user.role)}
                        </span>
                        {(user.employer_name || user.hbt_name) ? (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                            {user.employer_name || user.hbt_name}
                          </span>
                        ) : null}
                        <span className="text-xs font-semibold text-slate-400">{formatDate(user.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Content</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">Published inventory</h3>
                  </div>
                  <Link to="/admin/resources" className="text-sm font-black text-blue-600 hover:text-blue-700">Open content</Link>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <ContentStat label="Resources" value={totalResources} href="/admin/resources" />
                  <ContentStat label="Pricing plans" value={totalPricing} href="/admin/pricing" />
                  <ContentStat label="FAQs" value={totalFAQs} href="/admin/faqs" />
                  <ContentStat label="Quizzes" value={totalQuizzes} href="/admin/quizzes" />
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Partnerships</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">Latest employer portals</h3>
                  </div>
                  <Link to="/admin/partnerships" className="text-sm font-black text-blue-600 hover:text-blue-700">View all</Link>
                </div>

                <div className="mt-5 divide-y divide-slate-100">
                  {latestPartnerships.length === 0 ? (
                    <p className="py-8 text-center text-sm font-semibold text-slate-500">No partnerships found.</p>
                  ) : latestPartnerships.map((partnership) => (
                    <div key={partnership.id} className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{partnership.employer_name || "Employer partnership"}</p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                          {partnership.hbt_name || "Unassigned HBT"} · {partnership.slug || `Partnership #${partnership.id}`}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                        partnership.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {partnership.status || "unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Inbox</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">Recent contact forms</h3>
                  </div>
                  <Link to="/admin/contact-messages" className="text-sm font-black text-blue-600 hover:text-blue-700">Open inbox</Link>
                </div>

                <div className="mt-5 divide-y divide-slate-100">
                  {recentMessages.length === 0 ? (
                    <p className="py-8 text-center text-sm font-semibold text-slate-500">No contact messages found.</p>
                  ) : recentMessages.map((message) => (
                    <div key={message.id} className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">{message.name || "Website visitor"}</p>
                          <p className="truncate text-xs font-semibold text-slate-500">{message.email || "No email"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                          Number(message.is_read) === 0
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {Number(message.is_read) === 0 ? "Unread" : "Read"}
                        </span>
                      </div>
                      {message.message ? (
                        <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-slate-600">{message.message}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
