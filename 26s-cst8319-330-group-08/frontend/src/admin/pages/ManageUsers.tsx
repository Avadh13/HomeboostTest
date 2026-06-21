import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import ChatWidget from "../../components/ChatWidget";
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
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

function ManageUsers() {
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load users");
        setUsers([]);
        return;
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load users:", error);
      alert("Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const hbtOptions = useMemo(() => {
    const uniqueTeams = new Map<string, string>();

    users.forEach((user) => {
      if (user.hbt_name) {
        uniqueTeams.set(user.hbt_name, user.hbt_name);
      }
    });

    return Array.from(uniqueTeams.values()).sort();
  }, [users]);

  const companyOptions = useMemo(() => {
    const uniqueCompanies = new Map<string, string>();

    users.forEach((user) => {
      if (user.employer_name) {
        uniqueCompanies.set(user.employer_name, user.employer_name);
      }
    });

    return Array.from(uniqueCompanies.values()).sort();
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

      const matchesRole =
        roleFilter === "all" || user.role === roleFilter;

      const matchesHBT =
        hbtFilter === "all" || user.hbt_name === hbtFilter;

      const matchesCompany =
        companyFilter === "all" || user.employer_name === companyFilter;

      const matchesStatus =
        statusFilter === "all" ||
        String(Number(user.is_active)) === statusFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesHBT &&
        matchesCompany &&
        matchesStatus
      );
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
    const response = await fetch(`${API_BASE_URL}/users/${id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to update user role");
      return;
    }

    alert("User role updated");
    loadUsers();
  };

  const updateStatus = async (id: number, is_active: number) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_active }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to update user status");
      return;
    }

    alert("User status updated");
    loadUsers();
  };

  return (
    <AdminLayout title="Manage Users">
      <div className="mb-6 rounded-2xl bg-white p-6 shadow">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              User Filters
            </h2>
            <p className="text-sm text-gray-500">
              Filter users by role, HBT team, company partnership, or status.
            </p>
          </div>

          <button
            onClick={clearFilters}
            className="rounded-lg border px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <input
            className="rounded-lg border p-3"
            placeholder="Search name, email, company..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <select
            className="rounded-lg border p-3"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border p-3"
            value={hbtFilter}
            onChange={(e) => setHbtFilter(e.target.value)}
          >
            <option value="all">All HBT Teams</option>
            {hbtOptions.map((teamName) => (
              <option key={teamName} value={teamName}>
                {teamName}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border p-3"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          >
            <option value="all">All Companies</option>
            {companyOptions.map((companyName) => (
              <option key={companyName} value={companyName}>
                {companyName}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border p-3"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="1">Active</option>
            <option value="0">Disabled</option>
          </select>
        </div>

        <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-700">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white p-6 shadow">
        {loading ? (
          <p className="text-gray-600">Loading users...</p>
        ) : (
          <>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-600">
                  <th className="p-3">ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">HBT Team</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{user.id}</td>

                    <td className="p-3">
                      <div className="font-semibold text-gray-900">
                        {user.full_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        Created:{" "}
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </td>

                    <td className="p-3">{user.email}</td>

                    <td className="p-3">
                      <select
                        className="rounded border p-2"
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3">
                      {user.hbt_name ? (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                          {user.hbt_name}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>

                    <td className="p-3">
                      {user.employer_name ? (
                        <div>
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                            {user.employer_name}
                          </span>

                          {user.partnership_slug && (
                            <div className="mt-1 text-xs text-gray-400">
                              /{user.partnership_slug}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>

                    <td className="p-3">
                      <select
                        className={`rounded border p-2 font-semibold ${
                          Number(user.is_active) === 1
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                        value={Number(user.is_active) === 1 ? "1" : "0"}
                        onChange={(e) =>
                          updateStatus(user.id, e.target.value === "1" ? 1 : 0)
                        }
                      >
                        <option value="1">Active</option>
                        <option value="0">Disabled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <p className="mt-4 text-gray-500">No users found.</p>
            )}
          </>
        )}
      </div>
      <ChatWidget />
    </AdminLayout>
  );
}

export default ManageUsers;