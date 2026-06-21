import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";
import ChatWidget from "../components/ChatWidget";

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
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [batches, setBatches] = useState<EnrollmentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPartnershipId, setUploadingPartnershipId] = useState<
    number | null
  >(null);

  const [createdEmployees, setCreatedEmployees] = useState<CreatedEmployee[]>(
    []
  );
  const [lastUploadSummary, setLastUploadSummary] = useState("");

  const token = localStorage.getItem("token");

  const loadPartnerships = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/partnerships/hbt`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load partnerships");
        setPartnerships([]);
        return;
      }

      setPartnerships(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load partnerships:", error);
      alert("Failed to load partnerships");
    }
  };

  const loadBatches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/enrollment/batches`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load enrollment batches");
        setBatches([]);
        return;
      }

      setBatches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load enrollment batches:", error);
      alert("Failed to load enrollment batches");
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

  const downloadCreatedEmployeesCsv = () => {
    if (createdEmployees.length === 0) {
      alert("No employee credentials available to download");
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
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "created_employee_credentials.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (
    partnershipId: number,
    file: File | null
  ) => {
    if (!file) {
      alert("Please select a CSV file");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a valid .csv file");
      return;
    }

    const confirmUpload = confirm(
      "Are you sure you want to upload employees to this specific employer partnership?"
    );

    if (!confirmUpload) return;

    try {
      setUploadingPartnershipId(partnershipId);
      setCreatedEmployees([]);
      setLastUploadSummary("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE_URL}/enrollment/partnership/${partnershipId}/employees`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "CSV upload failed");
        return;
      }

      const employees: CreatedEmployee[] = Array.isArray(
        data.created_employees
      )
        ? data.created_employees
        : [];

      setCreatedEmployees(employees);

      setLastUploadSummary(
        `Created: ${data.created || 0} | Skipped: ${
          data.skipped || 0
        } | Batch ID: ${data.batch_id || "N/A"}`
      );

      alert(
        `CSV upload completed.\n\nCreated: ${data.created}\nSkipped: ${data.skipped}\n\nDownload or copy the generated employee passwords from the page.`
      );

      await loadData();
    } catch (error) {
      console.error("CSV upload error:", error);
      alert("CSV upload failed");
    } finally {
      setUploadingPartnershipId(null);
    }
  };

  const handleRevokeBatch = async (batchId: number) => {
    const confirmRevoke = confirm(
      "Are you sure you want to revoke this CSV upload? This will permanently delete only employees created by this upload."
    );

    if (!confirmRevoke) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/enrollment/batches/${batchId}/revoke`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to revoke batch");
        return;
      }

      alert(
        `Enrollment batch deleted successfully.\nDeleted employees: ${
          data.deleted_employees || 0
        }`
      );

      await loadData();
    } catch (error) {
      console.error("Revoke batch error:", error);
      alert("Failed to revoke batch");
    }
  };

  const getBatchesForPartnership = (partnershipId: number) => {
    return batches.filter((batch) => batch.partnership_id === partnershipId);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link
                to="/hbt/dashboard"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                ← Back to HBT Dashboard
              </Link>

              <h1 className="mt-3 text-4xl font-black text-slate-950">
                Employer Partnerships
              </h1>

              <p className="mt-2 max-w-2xl text-slate-600">
                Upload employee CSV files to the correct employer partnership.
                If a file is uploaded by mistake, revoke that exact upload
                batch.
              </p>
            </div>

            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-slate-500">CSV format</p>
              <p className="font-mono text-sm font-bold text-slate-900">
                full_name,email
              </p>
            </div>
          </div>

          {createdEmployees.length > 0 && (
            <div className="rounded-3xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-green-900">
                    Employee Credentials Created
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-green-700">
                    {lastUploadSummary}
                  </p>

                  <p className="mt-2 text-sm text-green-700">
                    Save these passwords now. They are shown only after this CSV
                    upload.
                  </p>
                </div>

                <button
                  onClick={downloadCreatedEmployeesCsv}
                  className="rounded-full bg-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-green-800"
                >
                  Download Credentials CSV
                </button>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl bg-white">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-white text-left text-slate-500">
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Generated Password</th>
                    </tr>
                  </thead>

                  <tbody>
                    {createdEmployees.map((employee) => (
                      <tr key={employee.email} className="border-b">
                        <td className="p-3 font-semibold">
                          {employee.full_name}
                        </td>
                        <td className="p-3">{employee.email}</td>
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {employee.temporary_password}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <p className="text-slate-600">Loading partnerships...</p>
            </div>
          ) : partnerships.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <p className="text-slate-600">No partnerships found.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {partnerships.map((partnership) => {
                const partnershipBatches = getBatchesForPartnership(
                  partnership.id
                );

                return (
                  <div
                    key={partnership.id}
                    className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-xl font-black text-white">
                            {partnership.employer_name?.charAt(0) || "E"}
                          </div>

                          <div>
                            <h2 className="text-2xl font-black text-slate-950">
                              {partnership.employer_name}
                            </h2>
                            <p className="text-sm font-semibold text-slate-500">
                              /{partnership.slug}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3 text-sm">
                          <span className="rounded-full bg-green-100 px-3 py-1 font-bold text-green-700">
                            {partnership.status}
                          </span>

                          {partnership.phone && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                              {partnership.phone}
                            </span>
                          )}

                          {partnership.website && (
                            <a
                              href={partnership.website}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700"
                            >
                              Website
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="w-full rounded-2xl bg-slate-50 p-5 lg:w-96">
                        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                          Upload Employees CSV
                        </p>

                        <p className="mt-2 text-sm text-slate-600">
                          Upload only employees for{" "}
                          <strong>{partnership.employer_name}</strong>.
                        </p>

                        <input
                          type="file"
                          accept=".csv"
                          disabled={uploadingPartnershipId === partnership.id}
                          onChange={(e) =>
                            handleCsvUpload(
                              partnership.id,
                              e.target.files ? e.target.files[0] : null
                            )
                          }
                          className="mt-4 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                        />

                        {uploadingPartnershipId === partnership.id && (
                          <p className="mt-3 text-sm font-semibold text-blue-600">
                            Uploading...
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <h3 className="text-lg font-black text-slate-950">
                        Enrollment Upload Batches
                      </h3>

                      {partnershipBatches.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">
                          No CSV uploads yet for this employer.
                        </p>
                      ) : (
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b text-left text-slate-500">
                                <th className="p-3">Batch</th>
                                <th className="p-3">File</th>
                                <th className="p-3">Created</th>
                                <th className="p-3">Skipped</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Action</th>
                              </tr>
                            </thead>

                            <tbody>
                              {partnershipBatches.map((batch) => (
                                <tr key={batch.id} className="border-b">
                                  <td className="p-3 font-bold">
                                    #{batch.id}
                                  </td>
                                  <td className="p-3">
                                    {batch.original_filename || "CSV Upload"}
                                  </td>
                                  <td className="p-3">
                                    {batch.created_count}
                                  </td>
                                  <td className="p-3">
                                    {batch.skipped_count}
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                                        batch.status === "revoked"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-green-100 text-green-700"
                                      }`}
                                    >
                                      {batch.status}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    {batch.status === "active" ? (
                                      <button
                                        onClick={() =>
                                          handleRevokeBatch(batch.id)
                                        }
                                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                                      >
                                        Revoke Upload
                                      </button>
                                    ) : (
                                      <span className="text-xs text-slate-400">
                                        Revoked
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <ChatWidget />
    </main>
  );
}

export default HBTCompanies;