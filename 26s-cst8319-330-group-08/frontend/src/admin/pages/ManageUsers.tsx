import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import ChatWidget from "../../components/ChatWidget";
import { useToast } from "../../components/ToastProvider";

type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: number;
  created_at: string;
  team_id?: number | null;
  partnership_id?: number | null;
  hbt_name?: string | null;
  employer_name?: string | null;
  partnership_slug?: string | null;
};

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee" },
  { value: "hbt_admin", label: "HBT Admin" },
  { value: "hbt_member", label: "HBT Member" },
  { value: "company_admin", label: "Company Admin" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const roleBadgeClass = (role: string) => {
  if (role === "super_admin" || role === "admin") return "bg-slate-900 text-white";
  if (role === "hbt_admin" || role === "hbt_member") return "bg-violet-100 text-violet-700";
  if (role === "company_admin") return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
};

function ManageUsers() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [hbtFilter, setHbtFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const token = localStorage.getItem("token");

  const loadUsers = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to load users.");
        setUsers([]);
        return;
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const hbtOptions = useMemo(() => {
    return [...new Set(users.map((user) => user.hbt_name).filter(Boolean) as string[])].sort();
  }, [users]);

  const companyOptions = useMemo(() => {
    return [...new Set(users.map((user) => user.employer_name).filter(Boolean) as string[])].sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const search = searchText.toLowerCase().trim();
      const matchesSearch =
        !search ||
        user.full_name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.role?.toLowerCase().includes(search) ||
        user.hbt_name?.toLowerCase().includes(search) ||
        user.employer_name?.toLowerCase().includes(search);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesHBT = hbtFilter === "all" || user.hbt_name === hbtFilter;
      const matchesCompany = companyFilter === "all" || user.employer_name === companyFilter;
      const matchesStatus = statusFilter === "all" || String(Number(user.is_active)) === statusFilter;

      return matchesSearch && matchesRole && matchesHBT && matchesCompany && matchesStatus;
    });
  }, [users, searchText, roleFilter, hbtFilter, companyFilter, statusFilter]);

  const clearFilters = () => {
    setSearchText("");
    setRoleFilter("all");
    setHbtFilter("all");
    setCompanyFilter("all");
    setStatusFilter("all");
  };

  const updateRole = async (id: number, role: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Failed to update user role.");
        return;
      }

      toast.success("User role updated.");
      loadUsers();
    } catch (error) {
      console.error("Role update error:", error);
      toast.error("Could not update user role.");
    }
  };

  const updateStatus = async (id: number, is_active: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Failed to update user status.");
        return;
      }

      toast.success("User status updated.");
      loadUsers();
    } catch (error) {
      console.error("Status update error:", error);
      toast.error("Could not update user status.");
    }
  };

  return (
    <AdminLayout title="Manage Users">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">User directory</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Role and access control</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Search employees, HBT users, company admins, and platform admins. Update roles and account status from one compact table.
          </p>
          <button type="button" onClick={clearFilters} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">
            Clear Filters
          </button>
        </div>

        <div className="premium-card">
          <p className="eyebrow">Directory stats</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3">
              <p className="text-2xl font-black text-violet-700">{users.length}</p>
              <p className="text-[11px] font-bold text-slate-500">Users</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-2xl font-black text-emerald-700">{users.filter((user) => Number(user.is_active) === 1).length}</p>
              <p className="text-[11px] font-bold text-slate-500">Active</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3">
              <p className="text-2xl font-black text-blue-700">{users.filter((user) => user.role?.includes("hbt")).length}</p>
              <p className="text-[11px] font-bold text-slate-500">HBT</p>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input className="form-field" placeholder="Search name, email, company..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <select className="form-field" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <select className="form-field" value={hbtFilter} onChange={(e) => setHbtFilter(e.target.value)}>
            <option value="all">All HBT Teams</option>
            {hbtOptions.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
          </select>
          <select className="form-field" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="all">All Companies</option>
            {companyOptions.map((companyName) => <option key={companyName} value={companyName}>{companyName}</option>)}
          </select>
          <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="1">Active</option>
            <option value="0">Disabled</option>
          </select>
        </div>
        <p className="mt-3 text-sm font-bold text-slate-500">Showing {filteredUsers.length} of {users.length} users</p>
      </div>

      <div className="premium-card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center font-bold text-slate-500">Loading users...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">HBT Team</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-violet-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white">
                            {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-950">{user.full_name || "Unnamed user"}</p>
                            <p className="text-xs font-semibold text-slate-500">{user.email}</p>
                            <p className="text-[11px] text-slate-400">Created {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <select className={`rounded-xl border border-slate-200 px-3 py-2 text-xs font-black ${roleBadgeClass(user.role)}`} value={user.role} onChange={(e) => updateRole(user.id, e.target.value)}>
                          {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        {user.hbt_name ? <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{user.hbt_name}</span> : <span className="text-slate-400">N/A</span>}
                      </td>

                      <td className="px-4 py-3">
                        {user.employer_name ? (
                          <div>
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{user.employer_name}</span>
                            {user.partnership_slug && <div className="mt-1 text-xs font-semibold text-slate-400">/{user.partnership_slug}</div>}
                          </div>
                        ) : <span className="text-slate-400">N/A</span>}
                      </td>

                      <td className="px-4 py-3">
                        <select className={`rounded-xl border px-3 py-2 text-xs font-black ${Number(user.is_active) === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`} value={Number(user.is_active) === 1 ? "1" : "0"} onChange={(e) => updateStatus(user.id, e.target.value === "1" ? 1 : 0)}>
                          <option value="1">Active</option>
                          <option value="0">Disabled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && <div className="p-8 text-center text-slate-500">No users found.</div>}
          </>
        )}
      </div>
      <ChatWidget />
    </AdminLayout>
  );
}

export default ManageUsers;
