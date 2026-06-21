import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type Resource = {
  id: number;
  title: string;
  description?: string | null;
  content?: string | null;
  category?: string | null;
  resource_type?: string | null;
  image_url?: string | null;
  resource_url?: string | null;
};

function ResourceDetails() {
  const { id } = useParams();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/resources/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load resource");
        return res.json();
      })
      .then((data) => setResource(data))
      .catch(() => setResource(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <section className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/resources" className="text-blue-600 hover:underline">← Back to Resources</Link>
        {loading ? (
          <p className="mt-8 text-gray-600">Loading resource...</p>
        ) : !resource ? (
          <div className="bg-white rounded-xl shadow p-8 mt-8">
            <h1 className="text-2xl font-bold text-red-600">Resource not found</h1>
          </div>
        ) : (
          <article className="bg-white rounded-2xl shadow p-8 mt-8">
            {resource.image_url && <img src={resource.image_url} alt={resource.title} className="w-full h-72 object-cover rounded-xl mb-6" />}
            <div className="flex flex-wrap gap-2 mb-4">
              {resource.category && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">{resource.category}</span>}
              {resource.resource_type && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">{resource.resource_type}</span>}
            </div>
            <h1 className="text-4xl font-bold text-gray-900">{resource.title}</h1>
            {resource.description && <p className="text-xl text-gray-600 mt-4">{resource.description}</p>}
            {resource.content && <p className="text-gray-700 mt-6 leading-8 whitespace-pre-line">{resource.content}</p>}
            {resource.resource_url && (
              <a href={resource.resource_url} target="_blank" rel="noreferrer" className="inline-block mt-8 bg-black text-white px-6 py-3 rounded-lg">
                Open Resource
              </a>
            )}
          </article>
        )}
      </section>
    </main>
  );
}

export default ResourceDetails;
