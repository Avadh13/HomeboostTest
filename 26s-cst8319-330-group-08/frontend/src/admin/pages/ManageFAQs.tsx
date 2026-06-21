import { useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

type FAQ = {
  id: number;
  question: string;
  answer: string;
  page_slug: string;
  display_order: number;
  is_active: number;
};

function ManageFAQs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pageSlug, setPageSlug] = useState("home");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(1);

  const loadFaqs = async () => {
    const response = await fetch(`${API_BASE_URL}/faqs`);
    const data = await response.json();
    setFaqs(data);
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setPageSlug("home");
    setDisplayOrder(0);
    setIsActive(1);
  };

  const startEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setQuestion(faq.question || "");
    setAnswer(faq.answer || "");
    setPageSlug(faq.page_slug || "home");
    setDisplayOrder(faq.display_order || 0);
    setIsActive(faq.is_active ? 1 : 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingId
      ? `${API_BASE_URL}/faqs/${editingId}`
      : `${API_BASE_URL}/faqs`;

    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        answer,
        page_slug: pageSlug,
        display_order: displayOrder,
        is_active: isActive,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert(editingId ? "FAQ updated" : "FAQ created");
    resetForm();
    loadFaqs();
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Delete this FAQ?");

    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE_URL}/faqs/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert("FAQ deleted");
    loadFaqs();
  };

  return (
    <AdminLayout title="Manage FAQs">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow mb-8"
      >
        <h2 className="text-xl font-bold mb-4">
          {editingId ? "Edit FAQ" : "Add FAQ"}
        </h2>

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <textarea
          className="w-full border p-3 rounded mb-4"
          placeholder="Answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />

        <select
          className="w-full border p-3 rounded mb-4"
          value={pageSlug}
          onChange={(e) => setPageSlug(e.target.value)}
        >
          <option value="home">Home</option>
          <option value="resources">Resources</option>
          <option value="pricing">Pricing</option>
          <option value="employee-portal">Employee Portal</option>
        </select>

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
            {editingId ? "Update FAQ" : "Add FAQ"}
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

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Current FAQs</h2>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="border p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">
                Page: {faq.page_slug} | Order: {faq.display_order}
              </p>

              <h3 className="font-bold text-lg mb-2">{faq.question}</h3>

              <p className="text-gray-600 mb-3">{faq.answer}</p>

              <div className="flex gap-3">
                <button
                  onClick={() => startEdit(faq)}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(faq.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {faqs.length === 0 && (
            <p className="text-gray-500">No FAQs found.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default ManageFAQs;