import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import ChatWidget from "../../components/ChatWidget";
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
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    Promise.all([
      fetch(`${API_BASE_URL}/users`, { headers }).then((res) => res.json()),
      fetch(`${API_BASE_URL}/resources`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/pricing`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/faqs`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/contact`, { headers }).then((res) => res.json()),
      fetch(`${API_BASE_URL}/quizzes`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/hbts`, { headers }).then((res) => res.json()),
      fetch(`${API_BASE_URL}/admin-partnerships`, { headers }).then((res) =>
        res.json()
      ),
    ])
      .then(
        ([
          usersData,
          resources,
          pricing,
          faqs,
          messagesData,
          quizzes,
          hbts,
          partnershipsData,
        ]) => {
          setUsers(Array.isArray(usersData) ? usersData : []);
          setTotalResources(Array.isArray(resources) ? resources.length : 0);
          setTotalPricing(Array.isArray(pricing) ? pricing.length : 0);
          setTotalFAQs(Array.isArray(faqs) ? faqs.length : 0);
          setMessages(Array.isArray(messagesData) ? messagesData : []);
          setTotalQuizzes(Array.isArray(quizzes) ? quizzes.length : 0);
          setTotalHBTs(Array.isArray(hbts) ? hbts.length : 0);
          setPartnerships(
            Array.isArray(partnershipsData) ? partnershipsData : []
          );
        }
      )
      .catch((error) => {
        console.error("Dashboard load error:", error);
        alert("Failed to load dashboard stats");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const totalUsers = users.length;
  const totalMessages = messages.length;
  const unreadMessages = messages.filter(
    (message) => Number(message.is_read) === 0
  ).length;

  const activeUsers = users.filter((user) => Number(user.is_active) === 1)
    .length;

  const disabledUsers = users.filter((user) => Number(user.is_active) === 0)
    .length;

  const employeeCount = users.filter((user) => user.role === "employee").length;
  const hbtAdminCount = users.filter((user) => user.role === "hbt_admin").length;
  const adminCount = users.filter(
    (user) => user.role === "admin" || user.role === "super_admin"
  ).length;

  const activePartnerships = partnerships.filter(
    (partnership) => partnership.status === "active"
  ).length;

  const maxContentValue = Math.max(
    totalResources,
    totalPricing,
    totalFAQs,
    totalQuizzes,
    totalMessages,
    1
  );

  const contentBars = [
    { label: "Resources", value: totalResources },
    { label: "Pricing", value: totalPricing },
    { label: "FAQs", value: totalFAQs },
    { label: "Quizzes", value: totalQuizzes },
    { label: "Messages", value: totalMessages },
  ];

  const roleBars = [
    { label: "Employees", value: employeeCount },
    { label: "HBT Admins", value: hbtAdminCount },
    { label: "Admins", value: adminCount },
  ];

  const recentUsers = useMemo(() => {
    return users.slice(0, 5);
  }, [users]);

  const recentMessages = useMemo(() => {
    return messages.slice(0, 4);
  }, [messages]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 to-blue-950 p-8 text-white shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
            Client Control Panel
          </p>

          <h1 className="mt-3 text-4xl font-black">Admin Dashboard</h1>

          <p className="mt-3 max-w-3xl text-blue-100">
            Monitor users, employer partnerships, Home Buying Teams, content,
            messages, and client-facing activity from one control center.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/admin/partnerships"
              className="rounded-full bg-white px-5 py-3 text-sm font-bold text-blue-950 hover:bg-blue-50"
            >
              Add Partnership
            </Link>

            <Link
              to="/admin/hbts"
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Add HBT Team
            </Link>

            <Link
              to="/admin/builder"
              className="rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              Builder Mode
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-gray-600">Loading dashboard stats...</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm font-semibold text-gray-500">
                  Total Users
                </p>
                <h2 className="mt-2 text-5xl font-black text-gray-900">
                  {totalUsers}
                </h2>
                <p className="mt-2 text-sm text-green-600">
                  {activeUsers} active / {disabledUsers} disabled
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm font-semibold text-gray-500">
                  HBT Teams
                </p>
                <h2 className="mt-2 text-5xl font-black text-gray-900">
                  {totalHBTs}
                </h2>
                <p className="mt-2 text-sm text-blue-600">
                  Home Buying Team accounts
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm font-semibold text-gray-500">
                  Partnerships
                </p>
                <h2 className="mt-2 text-5xl font-black text-gray-900">
                  {partnerships.length}
                </h2>
                <p className="mt-2 text-sm text-purple-600">
                  {activePartnerships} active company portals
                </p>
              </div>

              <div className="rounded-2xl border-l-4 border-red-500 bg-white p-6 shadow">
                <p className="text-sm font-semibold text-gray-500">
                  Unread Messages
                </p>
                <h2 className="mt-2 text-5xl font-black text-red-600">
                  {unreadMessages}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  {totalMessages} total contact messages
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-gray-900">
                    Users by Role
                  </h2>
                  <p className="text-sm text-gray-500">
                    Breakdown of platform users by access type.
                  </p>
                </div>

                <div className="space-y-5">
                  {roleBars.map((item) => {
                    const width =
                      totalUsers > 0 ? Math.max((item.value / totalUsers) * 100, 5) : 5;

                    return (
                      <div key={item.label}>
                        <div className="mb-2 flex justify-between text-sm font-semibold">
                          <span>{item.label}</span>
                          <span>{item.value}</span>
                        </div>

                        <div className="h-4 rounded-full bg-gray-100">
                          <div
                            className="h-4 rounded-full bg-blue-600"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-gray-900">
                    Content Overview
                  </h2>
                  <p className="text-sm text-gray-500">
                    Website content and communication activity.
                  </p>
                </div>

                <div className="space-y-5">
                  {contentBars.map((item) => {
                    const width = Math.max(
                      (item.value / maxContentValue) * 100,
                      5
                    );

                    return (
                      <div key={item.label}>
                        <div className="mb-2 flex justify-between text-sm font-semibold">
                          <span>{item.label}</span>
                          <span>{item.value}</span>
                        </div>

                        <div className="h-4 rounded-full bg-gray-100">
                          <div
                            className="h-4 rounded-full bg-indigo-600"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-3xl bg-white p-6 shadow xl:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">
                      Recent Users
                    </h2>
                    <p className="text-sm text-gray-500">
                      Latest user accounts in the system.
                    </p>
                  </div>

                  <Link
                    to="/admin/users"
                    className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
                  >
                    View All
                  </Link>
                </div>

                <div className="space-y-3">
                  {recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-bold text-gray-900">
                          {user.full_name}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                          {user.role.replace("_", " ")}
                        </span>

                        {user.hbt_name && (
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                            {user.hbt_name}
                          </span>
                        )}

                        {user.employer_name && (
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                            {user.employer_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {recentUsers.length === 0 && (
                    <p className="text-gray-500">No users found.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow">
                <h2 className="text-2xl font-black text-gray-900">
                  Quick Actions
                </h2>

                <div className="mt-5 space-y-3">
                  <Link
                    to="/admin/partnerships"
                    className="block rounded-2xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-700"
                  >
                    Create Employer Partnership
                  </Link>

                  <Link
                    to="/admin/hbts"
                    className="block rounded-2xl bg-gray-900 px-5 py-4 font-bold text-white hover:bg-black"
                  >
                    Add Home Buying Team
                  </Link>

                  <Link
                    to="/admin/resources"
                    className="block rounded-2xl bg-indigo-600 px-5 py-4 font-bold text-white hover:bg-indigo-700"
                  >
                    Manage Resources
                  </Link>

                  <Link
                    to="/admin/contact-messages"
                    className="block rounded-2xl bg-red-600 px-5 py-4 font-bold text-white hover:bg-red-700"
                  >
                    Review Messages
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900">
                  Recent Contact Messages
                </h2>
                <p className="text-sm text-gray-500">
                  Latest employer or employee inquiries.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {recentMessages.map((message) => (
                  <div key={message.id} className="rounded-2xl border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-bold text-gray-900">
                        {message.name || "Website Visitor"}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          Number(message.is_read) === 0
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {Number(message.is_read) === 0 ? "Unread" : "Read"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500">
                      {message.email || "No email"}
                    </p>

                    <p className="mt-3 line-clamp-2 text-sm text-gray-700">
                      {message.message || "No message preview available."}
                    </p>
                  </div>
                ))}

                {recentMessages.length === 0 && (
                  <p className="text-gray-500">No messages found.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <ChatWidget />
    </AdminLayout>
  );
}

export default AdminDashboard;