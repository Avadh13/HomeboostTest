import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type Resource = {
  id: number;
  title: string;
  description: string;
  category: string;
  resource_type?: string;
  type?: string;
  resource_url?: string;
  url?: string;
  image_url?: string;
};

function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${API_BASE_URL}/resources`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setResources(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        alert("Failed to load resources");
      });
  }, []);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <section className="text-center mb-12">
            <p className="text-sm font-semibold tracking-wide text-gray-500 uppercase mb-3">Resource Library</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Resource Library</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">Explore helpful guides, checklists, articles, and tools assigned to your employee benefit program.</p>
          </section>

          {loading ? (
            <div className="text-center text-gray-600">Loading resources...</div>
          ) : resources.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Resources Found</h2>
              <p className="text-gray-600">Resources assigned to your partnership will appear here.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => (
                <Link key={resource.id} to={`/resources/${resource.id}`} className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden">
                  {resource.image_url ? (
                    <img src={resource.image_url} alt={resource.title} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>
                  )}

                  <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {resource.category && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">{resource.category}</span>}
                      {(resource.resource_type || resource.type) && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">{resource.resource_type || resource.type}</span>}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">{resource.title}</h2>
                    <p className="text-gray-600 text-sm leading-6 line-clamp-3">{resource.description}</p>
                    <div className="mt-5 text-blue-600 font-medium">View Details →</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <section className="mt-14">
            <div className="bg-black text-white rounded-2xl p-8 text-center shadow">
              <p className="text-sm font-semibold tracking-wide text-gray-300 uppercase mb-3">Personalized Help</p>
              <h2 className="text-3xl font-bold mb-4">Find the right resource faster</h2>
              <p className="text-gray-300 max-w-2xl mx-auto mb-6">Take the Homeownership Readiness Quiz and discover which resources fit your current home buying, refinancing, or investing goals.</p>
              <Link to="/quiz" className="inline-block bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition">Take the Quiz</Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default Resources;
