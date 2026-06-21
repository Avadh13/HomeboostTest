import { useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

type Card = {
  id: number;
  section_id: number;
  section_title: string;
  section_key: string;
  title: string;
  description: string;
  image_url: string;
  button_text: string;
  button_link: string;
  display_order: number;
  is_active: number;
};

type Section = {
  id: number;
  title: string;
  section_key: string;
};

function ManageCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [sectionId, setSectionId] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(1);

  const loadCards = async () => {
    const response = await fetch(`${API_BASE_URL}/cards`);
    const data = await response.json();
    setCards(data);
  };

  const loadSections = async () => {
    const response = await fetch(`${API_BASE_URL}/sections`);
    const data = await response.json();
    setSections(data);

    if (data.length > 0) {
      setSectionId(data[0].id);
    }
  };

  useEffect(() => {
    loadCards();
    loadSections();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setSectionId(sections[0]?.id || 1);
    setTitle("");
    setDescription("");
    setImageUrl("");
    setButtonText("");
    setButtonLink("");
    setDisplayOrder(0);
    setIsActive(1);
  };

  const startEdit = (card: Card) => {
    setEditingId(card.id);
    setSectionId(card.section_id);
    setTitle(card.title || "");
    setDescription(card.description || "");
    setImageUrl(card.image_url || "");
    setButtonText(card.button_text || "");
    setButtonLink(card.button_link || "");
    setDisplayOrder(card.display_order || 0);
    setIsActive(card.is_active ? 1 : 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingId
      ? `${API_BASE_URL}/cards/${editingId}`
      : `${API_BASE_URL}/cards`;

    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        section_id: sectionId,
        title,
        description,
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

    alert(editingId ? "Card updated" : "Card created");
    resetForm();
    loadCards();
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Delete this card?");

    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE_URL}/cards/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert("Card deleted");
    loadCards();
  };

  return (
    <AdminLayout title="Manage Cards">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow mb-8"
      >
        <h2 className="text-xl font-bold mb-4">
          {editingId ? "Edit Card" : "Add Card"}
        </h2>

        <select
          className="w-full border p-3 rounded mb-4"
          value={sectionId}
          onChange={(e) => setSectionId(Number(e.target.value))}
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.title} ({section.section_key})
            </option>
          ))}
        </select>

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Card Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full border p-3 rounded mb-4"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
            {editingId ? "Update Card" : "Add Card"}
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
              <th className="p-3">Section</th>
              <th className="p-3">Title</th>
              <th className="p-3">Order</th>
              <th className="p-3">Active</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {cards.map((card) => (
              <tr key={card.id} className="border-b">
                <td className="p-3">{card.id}</td>
                <td className="p-3">{card.section_title}</td>
                <td className="p-3">{card.title}</td>
                <td className="p-3">{card.display_order}</td>
                <td className="p-3">{card.is_active ? "Yes" : "No"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(card)}
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(card.id)}
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

        {cards.length === 0 && (
          <p className="text-gray-500 mt-4">No cards found.</p>
        )}
      </div>
    </AdminLayout>
  );
}

export default ManageCards;