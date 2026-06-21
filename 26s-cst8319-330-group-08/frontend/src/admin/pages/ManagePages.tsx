import { useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

type Page = {
  id: number;
  slug: string;
  title: string;
  description: string;
  is_active: number;
};

function ManagePages() {
  const [pages, setPages] = useState<Page[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(1);

  const loadPages = async () => {
    const response = await fetch(`${API_BASE_URL}/pages`);
    const data = await response.json();
    setPages(data);
  };

  useEffect(() => {
    loadPages();
  }, []);

  const startEdit = (page: Page) => {
    setEditingId(page.id);
    setTitle(page.title || "");
    setDescription(page.description || "");
    setIsActive(page.is_active ? 1 : 0);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setIsActive(1);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) return;

    const response = await fetch(`${API_BASE_URL}/pages/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        is_active: isActive,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert("Page updated");
    resetForm();
    loadPages();
  };

  return (
    <AdminLayout title="Manage Pages">
      {editingId && (
        <form
          onSubmit={handleUpdate}
          className="bg-white p-6 rounded-lg shadow mb-8"
        >
          <h2 className="text-xl font-bold mb-4">Edit Page</h2>

          <input
            className="w-full border p-3 rounded mb-4"
            placeholder="Page Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="w-full border p-3 rounded mb-4"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <select
            className="w-full border p-3 rounded mb-4"
            value={isActive}
            onChange={(e) => setIsActive(Number(e.target.value))}
          >
            <option value={1}>Active</option>
            <option value={0}>Disabled</option>
          </select>

          <div className="flex gap-3">
            <button className="bg-black text-white px-6 py-3 rounded">
              Update Page
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="border px-6 py-3 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">ID</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Title</th>
              <th className="p-3">Description</th>
              <th className="p-3">Active</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-b">
                <td className="p-3">{page.id}</td>
                <td className="p-3">{page.slug}</td>
                <td className="p-3">{page.title}</td>
                <td className="p-3">{page.description}</td>
                <td className="p-3">{page.is_active ? "Yes" : "No"}</td>
                <td className="p-3">
                  <button
                    onClick={() => startEdit(page)}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages.length === 0 && (
          <p className="text-gray-500 mt-4">No pages found.</p>
        )}
      </div>
    </AdminLayout>
  );
}

export default ManagePages;