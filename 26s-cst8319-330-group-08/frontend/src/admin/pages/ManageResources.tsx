import { useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

type Resource = {
  id: number;
  title: string;
  description: string;
  category: string;
  resource_type: string;
  resource_url: string;
  image_url?: string;
};

function ManageResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [resourceType, setResourceType] = useState("article");
  const [resourceUrl, setResourceUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const loadResources = async () => {
    const response = await fetch(`${API_BASE_URL}/resources`, { headers });
    const data = await response.json();
    setResources(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadResources();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setResourceType("article");
    setResourceUrl("");
    setImageUrl("");
  };

  const startEdit = (resource: Resource) => {
    setEditingId(resource.id);
    setTitle(resource.title);
    setDescription(resource.description || "");
    setCategory(resource.category || "");
    setResourceType(resource.resource_type || "article");
    setResourceUrl(resource.resource_url || "");
    setImageUrl(resource.image_url || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingId ? `${API_BASE_URL}/resources/${editingId}` : `${API_BASE_URL}/resources`;
    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, resource_type: resourceType, resource_url: resourceUrl, image_url: imageUrl }),
    });

    const data = await response.json();
    if (!response.ok) {
      alert(data.message || "Resource save failed");
      return;
    }

    alert(editingId ? "Resource updated" : "Resource added");
    resetForm();
    loadResources();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this resource?")) return;

    const response = await fetch(`${API_BASE_URL}/resources/${id}`, { method: "DELETE", headers });
    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Delete failed");
      return;
    }

    alert("Resource deleted");
    loadResources();
  };

  return (
    <AdminLayout title="Manage Resources">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">{editingId ? "Edit Resource" : "Add Resource"}</h2>
        <input className="w-full border p-3 rounded mb-4" placeholder="Resource Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full border p-3 rounded mb-4" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="w-full border p-3 rounded mb-4" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <select className="w-full border p-3 rounded mb-4" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
          <option value="article">Article</option>
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
          <option value="link">Link</option>
          <option value="webinar">Webinar</option>
        </select>
        <input className="w-full border p-3 rounded mb-4" placeholder="Resource URL" value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} />
        <input className="w-full border p-3 rounded mb-4" placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <div className="flex gap-3">
          <button className="bg-black text-white px-6 py-3 rounded">{editingId ? "Update Resource" : "Add Resource"}</button>
          {editingId && <button type="button" onClick={resetForm} className="border px-6 py-3 rounded">Cancel</button>}
        </div>
      </form>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Current Resources</h2>
        <div className="space-y-4">
          {resources.map((resource) => (
            <div key={resource.id} className="border p-4 rounded">
              <h3 className="font-bold text-lg">{resource.title}</h3>
              <p className="text-gray-600">{resource.description}</p>
              <p className="text-sm text-gray-500 mb-3">{resource.category} | {resource.resource_type}</p>
              {resource.image_url && <img src={resource.image_url} alt={resource.title} className="w-40 h-24 object-cover rounded mb-3" />}
              <div className="flex gap-3">
                <button onClick={() => startEdit(resource)} className="bg-blue-600 text-white px-4 py-2 rounded">Edit</button>
                <button onClick={() => handleDelete(resource.id)} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
              </div>
            </div>
          ))}
          {resources.length === 0 && <p className="text-gray-500">No resources found.</p>}
        </div>
      </div>
    </AdminLayout>
  );
}

export default ManageResources;
