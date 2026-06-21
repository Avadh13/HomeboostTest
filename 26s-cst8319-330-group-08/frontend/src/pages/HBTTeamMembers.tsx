import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

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

function HBTTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load team members:", error);
      setTeamMembers([]);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, []);

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

  const startEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setFullName(member.full_name || "");
    setTitle(member.title || "");
    setEmail(member.email || "");
    setPhone(member.phone || "");
    setPhotoUrl(member.photo_url || "");
    setBookingLink(member.booking_link || "");
    setBio(member.bio || "");
    setIsActive(Number(member.is_active) === 1 ? 1 : 0);
    setPassword("");
    setConfirmPassword("");
    setCreatedLogin(null);
  };

  const copyPassword = async () => {
    if (!createdLogin?.temporary_password) return;

    await navigator.clipboard.writeText(createdLogin.temporary_password);
    alert("Password copied");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) {
      if (!email.trim()) {
        alert("Email is required because team member needs login access");
        return;
      }

      if (!password.trim()) {
        alert("Please set a password for this team member");
        return;
      }
    }

    if (password.trim()) {
      if (password.length < 6) {
        alert("Password should be at least 6 characters");
        return;
      }

      if (password !== confirmPassword) {
        alert("Password and confirm password do not match");
        return;
      }
    }

    const url = editingId
      ? `${API_BASE_URL}/team-members/${editingId}`
      : `${API_BASE_URL}/team-members`;

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

    if (password.trim()) {
      bodyData.password = password;
    }

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
        alert(data.message || "Failed to save team member");
        return;
      }

      if (!editingId && data.login) {
        setCreatedLogin(data.login);
        alert("Team member created with login access");
      } else if (editingId && password.trim()) {
        alert("Team member updated and password changed");
      } else {
        alert(editingId ? "Team member updated" : "Team member created");
      }

      resetForm();
      loadTeamMembers();
    } catch (error) {
      console.error("Failed to save team member:", error);
      alert("Failed to save team member");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Disable this team member login and profile?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/team-members/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to disable team member");
        return;
      }

      alert("Team member disabled");
      loadTeamMembers();
    } catch (error) {
      console.error("Failed to disable team member:", error);
      alert("Failed to disable team member");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          to="/hbt/dashboard"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Back to HBT Dashboard
        </Link>

        <section className="rounded-3xl bg-gradient-to-r from-slate-950 to-blue-950 p-8 text-white shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
            HBT Team Access
          </p>

          <h1 className="mt-3 text-4xl font-black">Team Members</h1>

          <p className="mt-3 max-w-3xl text-blue-100">
            Create team member profiles and login accounts so advisors can
            follow up with employees.
          </p>
        </section>

        {createdLogin && (
          <section className="rounded-3xl border border-green-200 bg-green-50 p-6 shadow">
            <h2 className="text-xl font-black text-green-800">
              Team Member Login Created
            </h2>

            <p className="mt-2 text-sm text-green-700">
              Share these credentials with the team member. Password is shown
              only now.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Email
                </p>
                <p className="mt-1 font-bold text-slate-950">
                  {createdLogin.email}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Password
                </p>
                <p className="mt-1 font-bold text-slate-950">
                  {createdLogin.temporary_password}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Role
                </p>
                <p className="mt-1 font-bold text-slate-950">
                  {createdLogin.role}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={copyPassword}
                className="rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-green-800"
              >
                Copy Password
              </button>

              <button
                onClick={() => setCreatedLogin(null)}
                className="rounded-xl border border-green-300 px-5 py-3 text-sm font-bold text-green-800 hover:bg-green-100"
              >
                Hide Credentials
              </button>
            </div>
          </section>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-3xl bg-white p-6 shadow md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <h2 className="text-2xl font-black text-slate-950">
              {editingId ? "Edit Team Member" : "Add Team Member"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {editingId
                ? "Update advisor profile details. Password fields are optional during edit."
                : "Create advisor profile and login access."}
            </p>
          </div>

          <input
            className="rounded-xl border p-3"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Title / Role"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Login Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={!editingId}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <input
            className="rounded-xl border p-3"
            placeholder={
              editingId ? "New Login Password (optional)" : "Set Login Password"
            }
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!editingId}
          />

          <input
            className="rounded-xl border p-3"
            placeholder={
              editingId
                ? "Confirm New Password (optional)"
                : "Confirm Login Password"
            }
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required={!editingId}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Photo URL"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Booking Link"
            value={bookingLink}
            onChange={(e) => setBookingLink(e.target.value)}
          />

          <textarea
            className="rounded-xl border p-3 md:col-span-2"
            placeholder="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          <select
            className="rounded-xl border p-3"
            value={isActive}
            onChange={(e) => setIsActive(Number(e.target.value))}
          >
            <option value={1}>Active</option>
            <option value={0}>Disabled</option>
          </select>

          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white hover:bg-black">
              {editingId ? "Update" : "Create Login"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border px-6 py-3 font-bold hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="space-y-4 rounded-3xl bg-white p-6 shadow">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              Current Team Members
            </h2>

            <p className="text-sm text-slate-500">
              These advisors can be shown to employees and can have login
              access.
            </p>
          </div>

          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border p-5 md:flex-row md:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-slate-950">
                    {member.full_name}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      Number(member.is_active) === 1
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {Number(member.is_active) === 1 ? "Active" : "Disabled"}
                  </span>

                  {member.login_role && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      {member.login_role}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-slate-600">
                  {member.title || "HBT Team Member"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {member.email || member.login_email || "No email"}
                  {member.phone && ` | ${member.phone}`}
                </p>

                {member.booking_link && (
                  <a
                    href={member.booking_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Booking Link
                  </a>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(member)}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(member.id)}
                  className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
                >
                  Disable
                </button>
              </div>
            </div>
          ))}

          {teamMembers.length === 0 && (
            <p className="text-slate-500">No team members yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}

export default HBTTeamMembers;