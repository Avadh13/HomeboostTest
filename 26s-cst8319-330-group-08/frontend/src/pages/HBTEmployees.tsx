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

type TeamMember = { id: number; full_name: string; email: string };

type LeadTodo = {
  id: number;
  todo_key: string;
  label: string;
  sort_order: number;
  is_completed: number;
  completed_at?: string | null;
};

type LeadAssignment = {
  id: number;
  employee_user_id: number;
  team_member_user_id: number;
  employee_name: string;
  employee_email: string;
  member_name: string;
  member_email: string;
  employer_name: string;
  partnership_slug: string;
  status: string;
  progress_percent: number;
  todos: LeadTodo[];
};

const initials = (value: string) => value.split(" ").filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "E";

function HBTEmployees() {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<LeadAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEmployeeId, setSavingEmployeeId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const token = localStorage.getItem("token");

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const [employeeResponse, progressResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/partnerships/hbt/employees`, { headers }),
        fetch(`${API_BASE_URL}/lead-progress/hbt`, { headers }),
      ]);

      const employeeData = await employeeResponse.json();
      const progressData = await progressResponse.json();

      if (!employeeResponse.ok) {
        toast.error(employeeData.message || "Failed to load employees.");
        setEmployees([]);
        return;
      }

      if (!progressResponse.ok) {
        toast.error(progressData.message || "Failed to load assignments.");
      }

      setEmployees(Array.isArray(employeeData) ? employeeData : []);
      setAssignments(Array.isArray(progressData.assignments) ? progressData.assignments : []);
      setTeamMembers(Array.isArray(progressData.team_members) ? progressData.team_members : []);
    } catch (error) {
      console.error("Employee load error:", error);
      toast.error("Failed to load employees.");
      setEmployees([]);
      setAssignments([]);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [token]);

  const assignmentByEmployeeId = useMemo(() => {
    const map = new Map<number, LeadAssignment>();
    assignments.forEach((assignment) => map.set(Number(assignment.employee_user_id), assignment));
    return map;
  }, [assignments]);

  const companies = useMemo(() => [...new Set(employees.map((employee) => employee.employer_name).filter(Boolean))].sort(), [employees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const assignment = assignmentByEmployeeId.get(Number(employee.id));
      const matchesSearch =
        !query ||
        employee.full_name?.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        employee.employer_name?.toLowerCase().includes(query) ||
        employee.partnership_slug?.toLowerCase().includes(query) ||
        assignment?.member_name?.toLowerCase().includes(query);
      const matchesCompany = companyFilter === "all" || employee.employer_name === companyFilter;
      const matchesStatus = statusFilter === "all" || String(Number(employee.is_active)) === statusFilter;
      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [assignmentByEmployeeId, companyFilter, employees, search, statusFilter]);

  const activeEmployees = employees.filter((employee) => Number(employee.is_active) === 1).length;
  const disabledEmployees = employees.filter((employee) => Number(employee.is_active) === 0).length;
  const assignedCount = assignments.length;
  const averageProgress = assignments.length ? Math.round(assignments.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / assignments.length) : 0;

  const assignEmployee = async (employeeId: number, memberId: string) => {
    if (!memberId) return;

    try {
      setSavingEmployeeId(employeeId);
      const response = await fetch(`${API_BASE_URL}/lead-progress/assign`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ employee_user_id: employeeId, team_member_user_id: Number(memberId) }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to assign employee.");
        return;
      }
      toast.success("Employee assigned to team member.");
      await loadEmployees();
    } catch {
      toast.error("Failed to assign employee.");
    } finally {
      setSavingEmployeeId(null);
    }
  };

  const toggleTodo = async (assignment: LeadAssignment, todo: LeadTodo) => {
    try {
      const response = await fetch(`${API_BASE_URL}/lead-progress/assignments/${assignment.id}/todos/${todo.id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: Number(todo.is_completed) === 1 ? 0 : 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Failed to update todo.");
        return;
      }
      await loadEmployees();
    } catch {
      toast.error("Failed to update todo.");
    }
  };

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="theme-panel">
          <Link to="/hbt/dashboard" className="text-sm font-black text-violet-200 hover:text-white">← Back to HBT Dashboard</Link>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Employee Leads</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Assign Employees + Track Progress</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">Assign each employee lead to an HBT member, manage todo progress, and review team workload in one place.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-3xl bg-white/10 p-3 backdrop-blur">
              <div><p className="text-2xl font-black">{employees.length}</p><p className="text-[11px] font-bold uppercase text-violet-100">Total</p></div>
              <div><p className="text-2xl font-black">{activeEmployees}</p><p className="text-[11px] font-bold uppercase text-violet-100">Active</p></div>
              <div><p className="text-2xl font-black">{assignedCount}</p><p className="text-[11px] font-bold uppercase text-violet-100">Assigned</p></div>
              <div><p className="text-2xl font-black">{averageProgress}%</p><p className="text-[11px] font-bold uppercase text-violet-100">Avg</p></div>
            </div>
          </div>
        </header>

        <section className="premium-card p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto] md:items-center">
            <input className="form-field" placeholder="Search employees, advisor, email, employer, slug..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className="form-field" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
              <option value="all">All employers</option>
              {companies.map((company) => <option key={company} value={company}>{company}</option>)}
            </select>
            <select className="form-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All status</option>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </select>
            <button onClick={loadEmployees} className="btn-secondary whitespace-nowrap">Refresh</button>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-500">Showing {filteredEmployees.length} of {employees.length} employees · Disabled: {disabledEmployees}</p>
        </section>

        {loading ? (
          <section className="premium-card p-8 text-center font-bold text-slate-500">Loading employees...</section>
        ) : filteredEmployees.length === 0 ? (
          <section className="premium-card p-8 text-center text-slate-500">No employees found.</section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-2">
            {filteredEmployees.map((employee) => {
              const assignment = assignmentByEmployeeId.get(Number(employee.id));
              const progress = Number(assignment?.progress_percent || 0);
              return (
                <article key={employee.id} className="premium-card">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white">{initials(employee.full_name || employee.email)}</div>
                      <div>
                        <h2 className="text-xl font-black text-slate-950">{employee.full_name}</h2>
                        <p className="text-sm font-semibold text-slate-500">{employee.email}</p>
                        <div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{employee.employer_name}</span><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">/{employee.partnership_slug}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${Number(employee.is_active) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{Number(employee.is_active) === 1 ? "Active" : "Disabled"}</span></div>
                      </div>
                    </div>
                    <div className="min-w-[220px]">
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-500">Assign to team member</label>
                      <select className="form-field mt-1" value={assignment?.team_member_user_id || ""} disabled={savingEmployeeId === employee.id} onChange={(event) => assignEmployee(employee.id, event.target.value)}>
                        <option value="">Unassigned</option>
                        {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Lead progress</p><p className="mt-1 text-sm font-bold text-slate-700">{assignment ? `Assigned to ${assignment.member_name}` : "Not assigned yet"}</p></div><span className="text-2xl font-black text-violet-700">{progress}%</span></div>
                    <div className="h-3 rounded-full bg-white"><div className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all" style={{ width: `${progress}%` }} /></div>

                    {!assignment ? <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">Assign this employee to start the todo checklist.</p> : (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {assignment.todos.map((todo) => (
                          <button key={todo.id} onClick={() => toggleTodo(assignment, todo)} className={`rounded-2xl border p-3 text-left text-sm font-bold transition ${Number(todo.is_completed) === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50"}`}>
                            <span className="mr-2">{Number(todo.is_completed) === 1 ? "✅" : "⬜"}</span>{todo.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTEmployees;
