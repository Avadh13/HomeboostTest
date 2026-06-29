import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
import { useToast } from "../components/ToastProvider";

type Partnership = {
  id: number;
  slug: string;
  status: string;
  created_at: string;
  employer_name: string;
  logo_url?: string | null;
  website?: string | null;
  phone?: string | null;
};

type EnrollmentBatch = {
  id: number;
  partnership_id: number;
  original_filename: string;
  created_count: number;
  skipped_count: number;
  status: string;
  created_at: string;
  revoked_at?: string | null;
  employer_name: string;
  slug: string;
};

type CreatedEmployee = {
  full_name: string;
  email: string;
  temporary_password: string;
};

function HBTCompanies() {
  const toast = useToast();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [batches, setBatches] = useState<EnrollmentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPartnershipId, setUploadingPartnershipId] = useState<number | null>(null);
  const [createdEmployees, setCreatedEmployees] = useState<CreatedEmployee[]>([]);
  const [lastUploadSummary, setLastUploadSummary] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadPartnerships = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/partnerships/hbt`, { headers });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to load partnerships.");
        setPartnerships([]);
        return;
      }

      setPartnerships(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load partnerships:", error);
      toast.error("Failed to load partnerships.");
    }
  };

  const loadBatches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/enrollment/batches`, { headers });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to load enrollment batches.");
        setBatches([]);
        return;
      }

      setBatches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load enrollment batches:", error);
      toast.error("Failed to load enrollment batches.");
    }
  };

  const loadData = async () => {
    setLoading(true);
    await loadPartnerships();
    await loadBatches();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPartnerships = useMemo(() => {
    const query = search.trim().toLowerCase();

    return partnerships.filter((partnership) => {
      const matchesSearch =
        !query ||
        partnership.employer_name?.toLowerCase().includes(query) ||
        partnership.slug?.toLowerCase().includes(query) ||
        partnership.website?.toLowerCase().includes(query) ||
        partnership.phone?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || partnership.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [partnerships, search, statusFilter]);

  const activePartnerships = partnerships.filter((partnership) => partnership.status === "active").length;
  const activeBatches = batches.filter((batch) => batch.status === "active").length;
  const revokedBatches = batches.filter((batch) => batch.status === "revoked").length;

  const getBatchesForPartnership = (partnershipId: number) => batches.filter((batch) => batch.partnership_id === partnershipId);

  const downloadCreatedEmployeesCsv = () => {
    if (createdEmployees.length === 0) {
      toast.info("No employee credentials available to download.");
      return;
    }

    const header = "full_name,email,temporary_password\n";
    const rows = createdEmployees
      .map((employee) => {
        const fullName = `"${employee.full_name.replace(/"/g, '""')}"`;
        const email = `"${employee.email.replace(/"/g, '""')}"`;
        const password = `"${employee.temporary_password.replace(/"/g, '""')}"`;
        return `${fullName},${email},${password}`;
      })
      .join("\n");

    const csvContent = `${header}${rows}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "created_employee_credentials.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (partnershipId: number, file: File | null) => {
    if (!file) {
      toast.warning("Please select a CSV file.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.warning("Please upload a valid .csv file.");
      return;
    }

    const confirmUpload = confirm("Are you sure you want to upload employees to this specific employer partnership?");
    if (!confirmUpload) return;

    try {
      setUploadingPartnershipId(partnershipId);
      setCreatedEmployees([]);
      setLastUploadSummary("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/enrollment/partnership/${partnershipId}/employees`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "CSV upload failed.");
        return;
      }

      const employees: CreatedEmployee[] = Array.isArray(data.created_employees) ? data.created_employees : [];
      setCreatedEmployees(employees);
      setLastUploadSummary(`Created: ${data.created || 0} | Skipped: ${data.skipped || 0} | Batch ID: ${data.batch_id || "N/A"}`);
      toast.success(`CSV upload completed. Created ${data.created || 0}, skipped ${data.skipped || 0}.`);
      await loadData();
    } catch (error) {
      console.error("CSV upload error:", error);
      toast.error("CSV upload failed.");
    } finally {
      setUploadingPartnershipId(null);
    }
  };

  const handleRevokeBatch = async (batchId: number) => {
    const confirmRevoke = confirm("Are you sure you want to revoke this CSV upload? This will permanently delete only employees created by this upload.");
    if (!confirmRevoke) return;

    try {
      const response = await fetch(`${API_BASE_URL}/enrollment/batches/${batchId}/revoke`, {
        method: "PUT",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to revoke batch.");
        return;
      }

      toast.success(`Enrollment batch deleted. Deleted employees: ${data.deleted_employees || 0}.`);
      await loadData();
    } catch (error) {
      console.error("Revoke batch error:", error);
      toast.error("Failed to revoke batch.");
    }
  };

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="theme-panel">
          <Link to="/hbt/dashboard" className="text-sm font-black text-violet-200 hover:text-white">← Back to HBT Dashboard</Link>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Employer Partnerships</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Company Enrollment Center</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">Upload employee CSV files to the correct employer partnership. Revoke an upload batch if a file was added by mistake.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-3xl bg-white/10 p-3 backdrop-blur">
              <div><p className="text-2xl font-black">{partnerships.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Total</p></div>
              <div><p className="text-2xl font-black">{activePartnerships}</p><p className="text-[11px] font-bold uppercase text-violet-100">Active</p></div>
              <div><p className="text-2xl font-black">{activeBatches}</p><p className="text-[11px] font-bold uppercase text-violet-100">Batches</p></div>
              <div><p className="text-2xl font-black">{revokedBatches}</p><p className="text-[11px] font-bold uppercase text-violet-100">Revoked</p></div>
            </div>
          </div>
        </header>

        <section className="premium-card p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-center">
            <input className="form-field" placeholder="Search employer, slug, phone, website..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="disabled">Disabled</option>
            </select>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">CSV: full_name,email</div>
          </div>
        </section>

        {createdEmployees.length > 0 && (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-emerald-900">Employee Credentials Created</h2>
                <p className="mt-1 text-sm font-bold text-emerald-700">{lastUploadSummary}</p>
                <p className="mt-2 text-sm text-emerald-700">Save these passwords now. They are shown only after this CSV upload.</p>
              </div>
              <button onClick={downloadCreatedEmployeesCsv} className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-800">Download Credentials CSV</button>
            </div>

            <div className="mt-5 max-h-80 overflow-auto rounded-2xl bg-white">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="border-b bg-white text-left text-slate-500"><th className="p-3">Employee Name</th><th className="p-3">Email</th><th className="p-3">Generated Password</th></tr></thead>
                <tbody>
                  {createdEmployees.map((employee) => (
                    <tr key={employee.email} className="border-b last:border-0"><td className="p-3 font-bold">{employee.full_name}</td><td className="p-3">{employee.email}</td><td className="p-3 font-mono font-black text-blue-700">{employee.temporary_password}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {loading ? (
          <div className="premium-card p-8 text-center font-bold text-slate-500">Loading partnerships...</div>
        ) : filteredPartnerships.length === 0 ? (
          <div className="premium-card p-8 text-center text-slate-500">No partnerships found.</div>
        ) : (
          <div className="grid gap-5">
            {filteredPartnerships.map((partnership) => {
              const partnershipBatches = getBatchesForPartnership(partnership.id);
              return (
                <article key={partnership.id} className="premium-card p-0 overflow-hidden">
                  <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
                    <div className="p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-violet-700 text-xl font-black text-white">
                            {partnership.logo_url ? <img src={partnership.logo_url} alt={partnership.employer_name} className="h-full w-full object-cover" /> : partnership.employer_name?.charAt(0) || "E"}
                          </div>
                          <div>
                            <h2 className="text-2xl font-black text-slate-950">{partnership.employer_name}</h2>
                            <p className="text-sm font-bold text-violet-600">/{partnership.slug}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 font-black text-emerald-700">{partnership.status}</span>
                          {partnership.phone && <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">{partnership.phone}</span>}
                          {partnership.website && <a href={partnership.website} target="_blank" rel="noreferrer" className="rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-700">Website</a>}
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-lg font-black text-slate-950">Enrollment Upload Batches</h3>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{partnershipBatches.length} uploads</span>
                        </div>

                        {partnershipBatches.length === 0 ? (
                          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No CSV uploads yet for this employer.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="w-full border-collapse text-sm">
                              <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Batch</th><th className="p-3">File</th><th className="p-3">Created</th><th className="p-3">Skipped</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
                              <tbody>
                                {partnershipBatches.map((batch) => (
                                  <tr key={batch.id} className="border-b last:border-0">
                                    <td className="p-3 font-black">#{batch.id}</td>
                                    <td className="p-3">{batch.original_filename || "CSV Upload"}</td>
                                    <td className="p-3 font-bold text-emerald-700">{batch.created_count}</td>
                                    <td className="p-3 font-bold text-amber-700">{batch.skipped_count}</td>
                                    <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${batch.status === "revoked" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{batch.status}</span></td>
                                    <td className="p-3">{batch.status === "active" ? <button onClick={() => handleRevokeBatch(batch.id)} className="rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700">Revoke</button> : <span className="text-xs text-slate-400">Revoked</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50 p-5 lg:border-l lg:border-t-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Upload Employees CSV</p>
                      <h3 className="mt-2 text-xl font-black text-slate-950">{partnership.employer_name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">Upload only employees for this employer. Required CSV columns: <strong>full_name,email</strong>.</p>
                      <input
                        type="file"
                        accept=".csv"
                        disabled={uploadingPartnershipId === partnership.id}
                        onChange={(e) => handleCsvUpload(partnership.id, e.target.files ? e.target.files[0] : null)}
                        className="mt-4 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                      />
                      {uploadingPartnershipId === partnership.id && <p className="mt-3 text-sm font-black text-blue-600">Uploading...</p>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTCompanies;
