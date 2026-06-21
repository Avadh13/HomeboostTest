import { useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

type HBT = {
  id: number;
  name: string;
  description: string;
  logo_url: string;
  email: string;
  phone: string;
  website: string;
  is_active: number;
  admin_name?: string | null;
  admin_email?: string | null;
};

function ManageHBTs() {
  const [hbts, setHbts] = useState<HBT[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isActive, setIsActive] = useState(1);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const loadHBTs = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/hbts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load HBT teams");
        setHbts([]);
        return;
      }

      setHbts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load HBT teams:", error);
      alert("Failed to load HBT teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHBTs();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTeamName("");
    setDescription("");
    setLogoUrl("");
    setContactEmail("");
    setContactPhone("");
    setWebsiteUrl("");
    setIsActive(1);
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
  };

  const startEdit = (hbt: HBT) => {
    setEditingId(hbt.id);
    setTeamName(hbt.name || "");
    setDescription(hbt.description || "");
    setLogoUrl(hbt.logo_url || "");
    setContactEmail(hbt.email || "");
    setContactPhone(hbt.phone || "");
    setWebsiteUrl(hbt.website || "");
    setIsActive(hbt.is_active ? 1 : 0);

    setAdminName(hbt.admin_name || "");
    setAdminEmail(hbt.admin_email || "");
    setAdminPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim()) {
      alert("Team name is required");
      return;
    }

    if (!editingId && (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim())) {
      alert("HBT Admin name, email, and password are required when creating a new team");
      return;
    }

    const url = editingId
      ? `${API_BASE_URL}/hbts/${editingId}`
      : `${API_BASE_URL}/hbts`;

    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: teamName,
          description,
          logo_url: logoUrl,
          email: contactEmail,
          phone: contactPhone,
          website: websiteUrl,
          is_active: isActive,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to save HBT");
        return;
      }

      alert(
        editingId
          ? "HBT updated successfully"
          : `HBT created successfully.\nLogin Email: ${data.admin_email}`
      );

      resetForm();
      loadHBTs();
    } catch (error) {
      console.error("Save HBT error:", error);
      alert("Failed to save HBT");
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm(
      "Disable this Home Buying Team and its HBT admin login?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/hbts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to disable HBT");
        return;
      }

      alert("HBT disabled successfully");
      loadHBTs();
    } catch (error) {
      console.error("Disable HBT error:", error);
      alert("Failed to disable HBT");
    }
  };

  return (
    <AdminLayout title="Manage Home Buying Teams">
      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-2xl bg-white p-6 shadow"
      >
        <h2 className="mb-4 text-xl font-bold">
          {editingId ? "Edit HBT" : "Add HBT Team + Admin Login"}
        </h2>

        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="font-bold text-blue-900">Team Information</h3>
          <p className="text-sm text-blue-700">
            Create the Home Buying Team profile that will be assigned to employer partnerships.
          </p>
        </div>

        <input
          className="mb-4 w-full rounded border p-3"
          placeholder="Team Name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />

        <textarea
          className="mb-4 w-full rounded border p-3"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          className="mb-4 w-full rounded border p-3"
          placeholder="Logo URL"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
        />

        <input
          className="mb-4 w-full rounded border p-3"
          placeholder="Team Contact Email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />

        <input
          className="mb-4 w-full rounded border p-3"
          placeholder="Team Contact Phone"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />

        <input
          className="mb-4 w-full rounded border p-3"
          placeholder="Website URL"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />

        <select
          className="mb-6 w-full rounded border p-3"
          value={isActive}
          onChange={(e) => setIsActive(Number(e.target.value))}
        >
          <option value={1}>Active</option>
          <option value={0}>Disabled</option>
        </select>

        {!editingId && (
          <>
            <div className="mb-6 rounded-xl border border-green-100 bg-green-50 p-4">
              <h3 className="font-bold text-green-900">HBT Admin Login</h3>
              <p className="text-sm text-green-700">
                This login will be created automatically and linked to this HBT team.
              </p>
            </div>

            <input
              className="mb-4 w-full rounded border p-3"
              placeholder="HBT Admin Full Name"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />

            <input
              className="mb-4 w-full rounded border p-3"
              placeholder="HBT Admin Email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />

            <input
              className="mb-4 w-full rounded border p-3"
              placeholder="HBT Admin Password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
          </>
        )}

        {editingId && (
          <div className="mb-6 rounded-xl border border-yellow-100 bg-yellow-50 p-4">
            <h3 className="font-bold text-yellow-900">Linked HBT Admin</h3>
            <p className="text-sm text-yellow-700">
              Admin Name: {adminName || "N/A"}
            </p>
            <p className="text-sm text-yellow-700">
              Admin Email: {adminEmail || "N/A"}
            </p>
            <p className="mt-2 text-xs text-yellow-700">
              Password changes are not handled here yet. Create a password reset feature later if needed.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button className="rounded bg-black px-6 py-3 text-white">
            {editingId ? "Update HBT" : "Add HBT + Create Login"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border px-6 py-3"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">Current Home Buying Teams</h2>

        {loading ? (
          <p className="text-gray-500">Loading Home Buying Teams...</p>
        ) : (
          <div className="space-y-4">
            {hbts.map((hbt) => (
              <div key={hbt.id} className="rounded-lg border p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{hbt.name}</h3>
                    <p className="text-gray-600">{hbt.description}</p>

                    <p className="mt-2 text-sm text-gray-500">
                      Team Email: {hbt.email || "N/A"} | Phone:{" "}
                      {hbt.phone || "N/A"}
                    </p>

                    <p className="text-sm text-gray-500">
                      HBT Admin: {hbt.admin_name || "N/A"} |{" "}
                      {hbt.admin_email || "No login assigned"}
                    </p>

                    <p className="text-sm text-gray-500">
                      Status: {hbt.is_active ? "Active" : "Disabled"}
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => startEdit(hbt)}
                      className="rounded bg-blue-600 px-4 py-2 text-white"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(hbt.id)}
                      className="rounded bg-red-600 px-4 py-2 text-white"
                    >
                      Disable
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {hbts.length === 0 && (
              <p className="text-gray-500">No Home Buying Teams found.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default ManageHBTs;