import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

type Resource = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  resource_type?: string | null;
  is_global?: number;
};

function HBTResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/resources`)
      .then((res) => res.json())
      .then((data) => setResources(Array.isArray(data) ? data : []))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to="/hbt/dashboard" className="text-blue-600 hover:underline">← Back to HBT Dashboard</Link>

        <section className="bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900">HBT Resources</h1>
          <p className="text-gray-700 mt-3">View resources available to employees under your programs.</p>
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          {loading ? <p>Loading resources...</p> : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => (
                <Link key={resource.id} to={`/resources/${resource.id}`} className="border rounded p-4 hover:bg-gray-50">
                  <h2 className="font-bold text-lg">{resource.title}</h2>
                  <p className="text-gray-600 text-sm mt-2">{resource.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {resource.category && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{resource.category}</span>}
                    {resource.resource_type && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{resource.resource_type}</span>}
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{Number(resource.is_global) === 1 ? "Global" : "Team"}</span>
                  </div>
                </Link>
              ))}
              {resources.length === 0 && <p className="text-gray-500">No resources found.</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default HBTResources;
