import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";
import { useToast } from "../components/ToastProvider";

type Profile = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  team_name?: string | null;
  employer_name?: string | null;
  partnership_slug?: string | null;
  phone?: string | null;
  job_title?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  bio?: string | null;
  photo_url?: string | null;
};

type ProfilePageProps = {
  embedded?: boolean;
};

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const getDashboardPath = (role?: string) => {
  if (role === "admin" || role === "super_admin") return "/admin";
  if (role === "hbt_admin") return "/hbt/dashboard";
  if (role === "hbt_member") return "/hbt/member-dashboard";
  if (role === "company_admin" || role === "company") return "/company/dashboard";
  if (role === "employee") return "/employee-portal";
  return "/";
};

const initials = (name?: string | null) => (name || "User").trim().charAt(0).toUpperCase() || "U";

function ProfilePage({ embedded = false }: ProfilePageProps) {
  const toast = useToast();
  const user = readUser();
  const token = localStorage.getItem("token");
  const apiOrigin = useMemo(() => API_BASE_URL.replace(/\/api\/?$/, ""), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    job_title: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    bio: "",
    photo_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const imageSrc = (url?: string | null) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${apiOrigin}${url.startsWith("/") ? url : `/${url}`}`;
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/profile/me`, { headers });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to load profile.");
        return;
      }

      setProfile(data.profile);
      setForm({
        full_name: data.profile.full_name || "",
        phone: data.profile.phone || "",
        job_title: data.profile.job_title || "",
        address: data.profile.address || "",
        city: data.profile.city || "",
        province: data.profile.province || "",
        postal_code: data.profile.postal_code || "",
        bio: data.profile.bio || "",
        photo_url: data.profile.photo_url || "",
      });
    } catch {
      toast.error("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.warning("Please select an image file.");
      return;
    }

    const body = new FormData();
    body.append("image", file);

    try {
      setUploading(true);
      const response = await fetch(`${API_BASE_URL}/upload/image`, {
        method: "POST",
        body,
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Photo upload failed.");
        return;
      }

      updateField("photo_url", data.image_url);
      toast.success("Photo uploaded. Save profile to apply it.");
    } catch {
      toast.error("Photo upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.full_name.trim()) {
      toast.warning("Full name is required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to update profile.");
        return;
      }

      setProfile(data.profile);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Profile updated successfully.");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = (value?: string) => (value || "user").replace(/_/g, " ");
  const dashboardPath = getDashboardPath(profile?.role || user.role);
  const pageClass = embedded ? "space-y-6" : "min-h-screen bg-slate-50 text-slate-950";
  const contentClass = embedded ? "mx-auto max-w-7xl space-y-6" : "mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8";

  return (
    <main className={pageClass}>
      {!embedded && <Navbar />}

      <section className={contentClass}>
        <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-6 text-white shadow-xl md:p-8">
          {!embedded && <Link to={dashboardPath} className="text-sm font-black text-blue-200 hover:text-white">← Back to dashboard</Link>}
          <div className={`${embedded ? "mt-0" : "mt-5"} grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end`}>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">Account Settings</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">Profile & personal details</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100 md:text-base">
                Keep your name, contact details, role title, address, bio, and profile photo up to date across HomeBoost dashboards and messages.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 text-sm font-bold text-blue-100 backdrop-blur">
              <p className="text-white">{profile?.email || user.email}</p>
              <p className="mt-1 capitalize">{roleLabel(profile?.role || user.role)}</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-[2rem] bg-white p-8 text-center font-bold text-slate-500 shadow-lg">Loading profile...</div>
        ) : (
          <form onSubmit={saveProfile} className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <aside className="rounded-[2rem] bg-white p-6 shadow-xl">
              <div className="flex flex-col items-center text-center">
                <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-6xl font-black text-blue-700 ring-4 ring-blue-50">
                  {form.photo_url ? <img src={imageSrc(form.photo_url)} alt="Profile" className="h-full w-full object-cover" /> : initials(form.full_name)}
                </div>

                <h2 className="mt-5 text-2xl font-black text-slate-950">{form.full_name || "Your Name"}</h2>
                <p className="mt-1 text-sm font-bold capitalize text-blue-600">{roleLabel(profile?.role)}</p>
                {(profile?.team_name || profile?.employer_name) && <p className="mt-2 text-sm text-slate-500">{profile.team_name || profile.employer_name}</p>}

                <label className="mt-6 w-full cursor-pointer rounded-full bg-blue-600 px-5 py-3 text-center text-sm font-black text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700">
                  {uploading ? "Uploading..." : "Upload photo"}
                  <input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" disabled={uploading} />
                </label>

                <input
                  className="form-field mt-3 text-center"
                  placeholder="Or paste photo URL"
                  value={form.photo_url}
                  onChange={(event) => updateField("photo_url", event.target.value)}
                />

                <button type="button" onClick={() => updateField("photo_url", "")} className="mt-3 text-sm font-black text-red-600 hover:text-red-700">
                  Remove photo
                </button>
              </div>
            </aside>

            <section className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Personal Details</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Update your profile</h2>
                <p className="mt-2 text-sm text-slate-500">These details are used for dashboards, advisor communication, and profile identity across the portal.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">Full name</span>
                  <input className="form-field" value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">Email</span>
                  <input className="form-field bg-slate-100 text-slate-500" value={profile?.email || ""} disabled />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">Phone</span>
                  <input className="form-field" placeholder="(555) 123-4567" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">Job title / role title</span>
                  <input className="form-field" placeholder="Mortgage Advisor, Manager, Client" value={form.job_title} onChange={(event) => updateField("job_title", event.target.value)} />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-black text-slate-700">Address</span>
                  <input className="form-field" placeholder="Street address" value={form.address} onChange={(event) => updateField("address", event.target.value)} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">City</span>
                  <input className="form-field" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">Province / State</span>
                  <input className="form-field" value={form.province} onChange={(event) => updateField("province", event.target.value)} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">Postal code</span>
                  <input className="form-field" value={form.postal_code} onChange={(event) => updateField("postal_code", event.target.value)} />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-black text-slate-700">Short bio</span>
                  <textarea className="form-field min-h-[130px]" placeholder="Add a short professional or personal note..." value={form.bio} onChange={(event) => updateField("bio", event.target.value)} />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <Link to={dashboardPath} className="rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200">Cancel</Link>
                <button disabled={saving || uploading} className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </section>
          </form>
        )}
      </section>
    </main>
  );
}

export default ProfilePage;
