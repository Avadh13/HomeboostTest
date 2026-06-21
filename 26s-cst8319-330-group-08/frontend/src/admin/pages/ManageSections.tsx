import { useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

type Section = {
  id: number;
  page_id: number;
  page_title: string;
  page_slug: string;
  section_key: string;
  title: string;
  subtitle: string;
  content: string;
  image_url: string;
  button_text: string;
  button_link: string;
  display_order: number;
  is_active: number;
};

type Page = {
  id: number;
  slug: string;
  title: string;
};

function ManageSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [pages, setPages] = useState<Page[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [pageId, setPageId] = useState(1);
  const [sectionKey, setSectionKey] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(1);

  const loadSections = async () => {
    const response = await fetch(`${API_BASE_URL}/sections`);
    const data = await response.json();
    setSections(data);
  };

  const loadPages = async () => {
    const response = await fetch(`${API_BASE_URL}/pages`);
    const data = await response.json();
    setPages(data);

    if (data.length > 0) {
      setPageId(data[0].id);
    }
  };

  useEffect(() => {
    loadSections();
    loadPages();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setPageId(pages[0]?.id || 1);
    setSectionKey("");
    setTitle("");
    setSubtitle("");
    setContent("");
    setImageUrl("");
    setButtonText("");
    setButtonLink("");
    setDisplayOrder(0);
    setIsActive(1);
  };

  const startEdit = (section: Section) => {
    setEditingId(section.id);
    setPageId(section.page_id);
    setSectionKey(section.section_key || "");
    setTitle(section.title || "");
    setSubtitle(section.subtitle || "");
    setContent(section.content || "");
    setImageUrl(section.image_url || "");
    setButtonText(section.button_text || "");
    setButtonLink(section.button_link || "");
    setDisplayOrder(section.display_order || 0);
    setIsActive(section.is_active ? 1 : 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingId
      ? `${API_BASE_URL}/sections/${editingId}`
      : `${API_BASE_URL}/sections`;

    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_id: pageId,
        section_key: sectionKey,
        title,
        subtitle,
        content,
        image_url: imageUrl,
        button_text: buttonText,
        button_link: buttonLink,
        display_order: displayOrder,
        is_active: isActive,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert(editingId ? "Section updated" : "Section created");
    resetForm();
    loadSections();
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Delete this section?");

    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE_URL}/sections/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert("Section deleted");
    loadSections();
  };

  return (
    <AdminLayout title="Manage Sections">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow mb-8"
      >
        <h2 className="text-xl font-bold mb-4">
          {editingId ? "Edit Section" : "Add Section"}
        </h2>

        <select
          className="w-full border p-3 rounded mb-4"
          value={pageId}
          onChange={(e) => setPageId(Number(e.target.value))}
        >
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.title}
            </option>
          ))}
        </select>

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Section Key"
          value={sectionKey}
          onChange={(e) => setSectionKey(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Section Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />

        <textarea
          className="w-full border p-3 rounded mb-4"
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Button Text"
          value={buttonText}
          onChange={(e) => setButtonText(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Button Link"
          value={buttonLink}
          onChange={(e) => setButtonLink(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-4"
          type="number"
          placeholder="Display Order"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(Number(e.target.value))}
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
            {editingId ? "Update Section" : "Add Section"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="border px-6 py-3 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">ID</th>
              <th className="p-3">Page</th>
              <th className="p-3">Key</th>
              <th className="p-3">Title</th>
              <th className="p-3">Order</th>
              <th className="p-3">Active</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {sections.map((section) => (
              <tr key={section.id} className="border-b">
                <td className="p-3">{section.id}</td>
                <td className="p-3">{section.page_title}</td>
                <td className="p-3">{section.section_key}</td>
                <td className="p-3">{section.title}</td>
                <td className="p-3">{section.display_order}</td>
                <td className="p-3">{section.is_active ? "Yes" : "No"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(section)}
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(section.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sections.length === 0 && (
          <p className="text-gray-500 mt-4">No sections found.</p>
        )}
      </div>
    </AdminLayout>
  );
}

export default ManageSections;