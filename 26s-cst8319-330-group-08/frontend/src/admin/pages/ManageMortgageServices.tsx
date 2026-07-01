import { type FormEvent, useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type MortgageService = {
  id: number;
  service_key: string;
  title: string;
  short_title: string | null;
  description: string | null;
  icon: string | null;
  color_class: string | null;
  display_order: number;
  is_active: number;
};

const colorOptions = [
  "from-blue-500 to-sky-500",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-violet-500",
];

const blankService = {
  service_key: "",
  title: "",
  short_title: "",
  description: "",
  icon: "🏡",
  color_class: colorOptions[0],
  is_active: 1,
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function ManageMortgageServices() {
  const toast = useToast();
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const [services, setServices] = useState<MortgageService[]>([]);
  const [newService, setNewService] = useState(blankService);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/mortgage-services/admin`, { headers });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to load services.");
        return;
      }
      setServices(Array.isArray(data.services) ? data.services : []);
    } catch {
      toast.error("Failed to load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const updateService = (id: number, field: keyof MortgageService, value: string | number) => {
    setServices((prev) => prev.map((service) => (service.id === id ? ({ ...service, [field]: value } as MortgageService) : service)));
  };

  const updateNewService = (field: keyof typeof blankService, value: string | number) => {
    setNewService((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !prev.service_key) next.service_key = slugify(String(value));
      return next;
    });
  };

  const addService = async (event: FormEvent) => {
    event.preventDefault();
    if (!newService.title.trim()) {
      toast.warning("Service title is required.");
      return;
    }

    try {
      setSavingId("new");
      const response = await fetch(`${API_BASE_URL}/mortgage-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newService),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to add service.");
        return;
      }
      setNewService(blankService);
      await loadServices();
      toast.success("Service added.");
    } catch {
      toast.error("Failed to add service.");
    } finally {
      setSavingId(null);
    }
  };

  const saveService = async (service: MortgageService) => {
    try {
      setSavingId(service.id);
      const response = await fetch(`${API_BASE_URL}/mortgage-services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(service),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to save service.");
        return;
      }
      toast.success("Service saved.");
    } catch {
      toast.error("Failed to save service.");
    } finally {
      setSavingId(null);
    }
  };

  const moveService = async (id: number, direction: "up" | "down") => {
    try {
      const response = await fetch(`${API_BASE_URL}/mortgage-services/${id}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ direction }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to move service.");
        return;
      }
      await loadServices();
    } catch {
      toast.error("Failed to move service.");
    }
  };

  const removeService = async (id: number) => {
    if (!confirm("Remove this service?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/mortgage-services/${id}`, { method: "DELETE", headers });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to remove service.");
        return;
      }
      setServices((prev) => prev.filter((service) => service.id !== id));
      toast.success("Service removed.");
    } catch {
      toast.error("Failed to remove service.");
    }
  };

  return (
    <AdminLayout title="Mortgage Services">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-6">
          <form onSubmit={addService} className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Services Builder</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Add mortgage service</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input className="form-field" placeholder="Service title" value={newService.title} onChange={(e) => updateNewService("title", e.target.value)} />
              <input className="form-field" placeholder="Service key" value={newService.service_key} onChange={(e) => updateNewService("service_key", e.target.value)} />
              <input className="form-field" placeholder="Short title" value={newService.short_title} onChange={(e) => updateNewService("short_title", e.target.value)} />
              <input className="form-field" placeholder="Icon emoji" value={newService.icon} onChange={(e) => updateNewService("icon", e.target.value)} />
              <select className="form-field" value={newService.color_class} onChange={(e) => updateNewService("color_class", e.target.value)}>{colorOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700"><input type="checkbox" checked={Number(newService.is_active) === 1} onChange={(e) => updateNewService("is_active", e.target.checked ? 1 : 0)} /> Active</label>
              <textarea className="form-field min-h-[100px] md:col-span-2" placeholder="Description" value={newService.description} onChange={(e) => updateNewService("description", e.target.value)} />
            </div>
            <button disabled={savingId === "new"} className="mt-5 rounded-full bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">{savingId === "new" ? "Adding..." : "Add service"}</button>
          </form>

          <div className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Live Preview</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Active service cards</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {services.filter((service) => Number(service.is_active) === 1).map((service) => (
                <div key={service.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                  <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${service.color_class || colorOptions[0]} text-2xl`}>{service.icon || "🏡"}</span>
                  <h3 className="text-xl font-black text-slate-950">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="rounded-[2rem] bg-white p-5 shadow-xl md:p-6 xl:sticky xl:top-6 xl:self-start">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Arrange & Edit</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Services list</h2>
          {loading ? <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center font-bold text-slate-500">Loading services...</div> : <div className="mt-5 space-y-3">
            {services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="form-field bg-white" value={service.title} onChange={(e) => updateService(service.id, "title", e.target.value)} />
                  <input className="form-field bg-white" value={service.service_key} onChange={(e) => updateService(service.id, "service_key", e.target.value)} />
                  <input className="form-field bg-white" value={service.short_title || ""} onChange={(e) => updateService(service.id, "short_title", e.target.value)} />
                  <input className="form-field bg-white" value={service.icon || ""} onChange={(e) => updateService(service.id, "icon", e.target.value)} />
                  <select className="form-field bg-white" value={service.color_class || colorOptions[0]} onChange={(e) => updateService(service.id, "color_class", e.target.value)}>{colorOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                  <input className="form-field bg-white" type="number" value={service.display_order} onChange={(e) => updateService(service.id, "display_order", Number(e.target.value))} />
                  <textarea className="form-field min-h-[90px] bg-white md:col-span-2" value={service.description || ""} onChange={(e) => updateService(service.id, "description", e.target.value)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => moveService(service.id, "up")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50">↑ Up</button>
                  <button type="button" onClick={() => moveService(service.id, "down")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50">↓ Down</button>
                  <label className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200"><input type="checkbox" checked={Number(service.is_active) === 1} onChange={(e) => updateService(service.id, "is_active", e.target.checked ? 1 : 0)} /> Active</label>
                  <button type="button" onClick={() => saveService(service)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-blue-700">{savingId === service.id ? "Saving..." : "Save"}</button>
                  <button type="button" onClick={() => removeService(service.id)} className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-100">Remove</button>
                </div>
              </div>
            ))}
          </div>}
        </aside>
      </div>
    </AdminLayout>
  );
}

export default ManageMortgageServices;
