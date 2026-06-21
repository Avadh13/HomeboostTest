import { useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

type PricingPlan = {
  id: number;
  title: string;
  price: string;
  description: string;
  features: string;
  button_text: string;
  button_link: string;
  display_order: number;
  is_active: number;
};

function ManagePricing() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(1);

  const loadPlans = async () => {
    const response = await fetch(`${API_BASE_URL}/pricing`);
    const data = await response.json();
    setPlans(data);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setPrice("");
    setDescription("");
    setFeatures("");
    setButtonText("");
    setButtonLink("");
    setDisplayOrder(0);
    setIsActive(1);
  };

  const startEdit = (plan: PricingPlan) => {
    setEditingId(plan.id);
    setTitle(plan.title || "");
    setPrice(plan.price || "");
    setDescription(plan.description || "");
    setFeatures(plan.features || "");
    setButtonText(plan.button_text || "");
    setButtonLink(plan.button_link || "");
    setDisplayOrder(plan.display_order || 0);
    setIsActive(plan.is_active ? 1 : 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingId
      ? `${API_BASE_URL}/pricing/${editingId}`
      : `${API_BASE_URL}/pricing`;

    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        price,
        description,
        features,
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

    alert(editingId ? "Pricing plan updated" : "Pricing plan created");
    resetForm();
    loadPlans();
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Delete this pricing plan?");

    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE_URL}/pricing/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert("Pricing plan deleted");
    loadPlans();
  };

  return (
    <AdminLayout title="Manage Pricing">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow mb-8"
      >
        <h2 className="text-xl font-bold mb-4">
          {editingId ? "Edit Pricing Plan" : "Add Pricing Plan"}
        </h2>

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Plan Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <textarea
          className="w-full border p-3 rounded mb-4"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <textarea
          className="w-full border p-3 rounded mb-4"
          placeholder="Features, comma separated"
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
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
            {editingId ? "Update Plan" : "Add Plan"}
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
              <th className="p-3">Title</th>
              <th className="p-3">Price</th>
              <th className="p-3">Order</th>
              <th className="p-3">Active</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b">
                <td className="p-3">{plan.id}</td>
                <td className="p-3">{plan.title}</td>
                <td className="p-3">{plan.price}</td>
                <td className="p-3">{plan.display_order}</td>
                <td className="p-3">{plan.is_active ? "Yes" : "No"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(plan)}
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(plan.id)}
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

        {plans.length === 0 && (
          <p className="text-gray-500 mt-4">No pricing plans found.</p>
        )}
      </div>
    </AdminLayout>
  );
}

export default ManagePricing;