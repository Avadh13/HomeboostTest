import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";

type Employee = {
  id: number;
  full_name: string;
  email: string;
  employer_name: string;
  partnership_slug: string;
  is_active: number;
};

function HBTEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${API_BASE_URL}/partnerships/hbt/employees`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to="/hbt/dashboard" className="text-blue-600 hover:underline">← Back to HBT Dashboard</Link>

        <section className="bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-700 mt-3">Employees signed up through your employer partnerships.</p>
        </section>

        <section className="bg-white rounded-xl shadow p-6 overflow-x-auto">
          {loading ? <p>Loading...</p> : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Employer</th>
                  <th className="p-3">Slug</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b">
                    <td className="p-3">{employee.full_name}</td>
                    <td className="p-3">{employee.email}</td>
                    <td className="p-3">{employee.employer_name}</td>
                    <td className="p-3">/{employee.partnership_slug}</td>
                    <td className="p-3">{Number(employee.is_active) === 1 ? "Active" : "Disabled"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && employees.length === 0 && <p className="text-gray-500 mt-4">No employees yet.</p>}
        </section>
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTEmployees;
