import { useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

type Quiz = {
  id: number;
  title: string;
  description: string;
  is_active: number;
  access_type: string;
  created_at: string;
};

function ManageQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(1);
  const [accessType, setAccessType] = useState("private");

  const loadQuizzes = async () => {
    const response = await fetch(`${API_BASE_URL}/quizzes`);
    const data = await response.json();
    setQuizzes(data);
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setIsActive(1);
    setAccessType("private");
  };

  const startEdit = (quiz: Quiz) => {
    setEditingId(quiz.id);
    setTitle(quiz.title || "");
    setDescription(quiz.description || "");
    setIsActive(quiz.is_active ? 1 : 0);
    setAccessType(quiz.access_type || "private");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingId
      ? `${API_BASE_URL}/quizzes/${editingId}`
      : `${API_BASE_URL}/quizzes`;

    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        is_active: isActive,
        access_type: accessType,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert(editingId ? "Quiz updated" : "Quiz created");
    resetForm();
    loadQuizzes();
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Delete this quiz?");

    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE_URL}/quizzes/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert("Quiz deleted");
    loadQuizzes();
  };

  return (
    <AdminLayout title="Manage Quizzes">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow mb-8"
      >
        <h2 className="text-xl font-bold mb-4">
          {editingId ? "Edit Quiz" : "Add Quiz"}
        </h2>

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Quiz Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full border p-3 rounded mb-4"
          placeholder="Quiz Description"
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

        <select
          className="w-full border p-3 rounded mb-4"
          value={accessType}
          onChange={(e) => setAccessType(e.target.value)}
        >
          <option value="private">Private - Employees only</option>
          <option value="public">Public - Visible on quiz page</option>
        </select>

        <div className="flex gap-3">
          <button className="bg-black text-white px-6 py-3 rounded">
            {editingId ? "Update Quiz" : "Add Quiz"}
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
        <h2 className="text-2xl font-bold mb-4">Current Quizzes</h2>

        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="border p-4 rounded-lg">
              <div className="flex justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg">{quiz.title}</h3>

                  <p className="text-gray-600">{quiz.description}</p>

                  <p className="text-sm text-gray-500 mt-1">
                    Status: {quiz.is_active ? "Active" : "Disabled"} | Access:{" "}
                    {quiz.access_type === "public" ? "Public" : "Private"}
                  </p>
                </div>

                <div className="flex gap-2 items-start">
                  <a
                    href={`/admin/quizzes/${quiz.id}/questions`}
                    className="bg-purple-600 text-white px-4 py-2 rounded"
                  >
                    Questions
                  </a>

                  <button
                    onClick={() => startEdit(quiz)}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(quiz.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {quizzes.length === 0 && (
            <p className="text-gray-500">No quizzes found.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default ManageQuizzes;