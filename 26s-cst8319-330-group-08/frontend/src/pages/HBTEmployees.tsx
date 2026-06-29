import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";
import { useToast } from "../components/ToastProvider";

type Employee = {
  id: number;
  full_name: string;
  email: string;
  employer_name: string;
  partnership_slug: string;
  is_active: number;
};

function HBTEmployees() {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const token = localStorage.getItem("token");

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/partnerships/hbt/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to load employees.");
        setEmployees([]);
        return;
      }

      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Employee load error:", error);
      toast.error("Failed to load employees.");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [token]);

  const companies = useMemo(() => {
    return [...new Set(employees.map((employee) => employee.employer_name).filter(Boolean))].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.full_name?.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        employee.employer_name?.toLowerCase().includes(query) ||
        employee.partnership_slug?.toLowerCase().includes(query);
      const matchesCompany = companyFilter === "all" || employee.employer_name === companyFilter;
      const matchesStatus = statusFilter === "all" || String(Number(employee.is_active)) === statusFilter;
      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [companyFilter, employees, search, statusFilter]);

  const activeEmployees = employees.filter((employee) => Number(employee.is_active) === 1).length;
  const disabledEmployees = employees.filter((employee) => Number(employee.is_active) === 0).length;

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="theme-panel">
          <Link to="/hbt/dashboard" className="text-sm font-black text-violet-200 hover:text-white">← Back to HBT Dashboard</Link>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Employee Directory</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Employees</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">Employees signed up through your employer partnerships. Search by employee, employer, email, or partnership slug.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-3xl bg-white/10 p-3 backdrop-blur">
              <div><p className="text-2xl font-black">{employees.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Total</p></div>
              <div><p className="text-2xl font-black">{activeEmployees}</p><p className="text-[11px] font-bold uppercase text-violet-100">Active</p></div>
              <div><p className="text-2xl font-black">{disabledEmployees}</p><p className="text-[11px] font-bold uppercase text-violet-100">Disabled</p></div>
            </div>
          </div>
        </header>

        <section className="premium-card p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto] md:items-center">
            <input className="form-field" placeholder="Search employees, email, employer, slug..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
              <option value="all">All employers</option>
              {companies.map((company) => <option key={company} value={company}>{company}</option>)}
            </select>
            <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All status</option>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </select>
            <button onClick={loadEmployees} className="btn-secondary whitespace-nowrap">Refresh</button>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-500">Showing {filteredEmployees.length} of {employees.length} employees</p>
        </section>

        <section className="premium-card overflow-hidden p-0">
          {loading ? (
            <div className="p-8 text-center font-bold text-slate-500">Loading employees...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No employees found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Employer</th>
                    <th className="px-4 py-3">Portal Slug</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b last:border-0 hover:bg-violet-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white">
                            {(employee.full_name || employee.email || "E").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-950">{employee.full_name}</p>
                            <p className="text-xs font-semibold text-slate-500">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{employee.employer_name}</span></td>
                      <td className="px-4 py-3"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">/{employee.partnership_slug}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${Number(employee.is_active) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{Number(employee.is_active) === 1 ? "Active" : "Disabled"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTEmployees;
