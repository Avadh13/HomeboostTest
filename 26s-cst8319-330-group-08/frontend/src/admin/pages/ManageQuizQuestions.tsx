import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

type QuizQuestion = {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: string;
  is_required: number;
  display_order: number;
  options?: QuizOption[];
};

type QuizOption = {
  id: number;
  question_id: number;
  option_text: string;
  display_order: number;
};

const questionTypes = [
  "short_text",
  "paragraph",
  "multiple_choice",
  "checkbox",
  "dropdown",
  "true_false",
  "number",
  "date",
  "email",
  "phone",
  "rating",
  "linear_scale",
];

function ManageQuizQuestions() {
  const { quizId } = useParams();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("short_text");
  const [isRequired, setIsRequired] = useState(1);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [options, setOptions] = useState<string[]>([""]);

  const needsOptions = [
    "multiple_choice",
    "checkbox",
    "dropdown",
    "true_false",
  ].includes(questionType);

  const loadQuestions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setQuestions(data);
      } else {
        console.log("Questions API error:", data);
        setQuestions([]);
      }
    } catch (error) {
      console.log("Failed to load questions:", error);
      setQuestions([]);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [quizId]);

  const resetForm = () => {
    setEditingId(null);
    setQuestionText("");
    setQuestionType("short_text");
    setIsRequired(1);
    setDisplayOrder(0);
    setOptions([""]);
  };

  const startEdit = (question: QuizQuestion) => {
    setEditingId(question.id);
    setQuestionText(question.question_text || "");
    setQuestionType(question.question_type || "short_text");
    setIsRequired(question.is_required ? 1 : 0);
    setDisplayOrder(question.display_order || 0);

    if (
      ["multiple_choice", "checkbox", "dropdown", "true_false"].includes(
        question.question_type
      ) &&
      question.options &&
      question.options.length > 0
    ) {
      setOptions(question.options.map((option) => option.option_text));
    } else {
      setOptions([""]);
    }
  };

  const addOptionField = () => {
    setOptions([...options, ""]);
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleQuestionTypeChange = (selectedType: string) => {
    setQuestionType(selectedType);

    if (selectedType === "true_false") {
      setOptions(["True", "False"]);
    } else if (
      ["multiple_choice", "checkbox", "dropdown"].includes(selectedType)
    ) {
      setOptions([""]);
    } else {
      setOptions([""]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingId
      ? `${API_BASE_URL}/quizzes/questions/${editingId}`
      : `${API_BASE_URL}/quizzes/questions`;

    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quiz_id: Number(quizId),
        question_text: questionText,
        question_type: questionType,
        is_required: isRequired,
        display_order: displayOrder,
        options: needsOptions ? options : [],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert(editingId ? "Question updated" : "Question created");
    resetForm();
    loadQuestions();
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Delete this question?");

    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE_URL}/quizzes/questions/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert("Question deleted");
    loadQuestions();
  };

  return (
    <AdminLayout title="Manage Quiz Questions">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow mb-8"
      >
        <h2 className="text-xl font-bold mb-4">
          {editingId ? "Edit Question" : "Add Question"}
        </h2>

        <textarea
          className="w-full border p-3 rounded mb-4"
          placeholder="Question text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
        />

        <select
          className="w-full border p-3 rounded mb-4"
          value={questionType}
          onChange={(e) => handleQuestionTypeChange(e.target.value)}
        >
          {questionTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace("_", " ")}
            </option>
          ))}
        </select>

        <select
          className="w-full border p-3 rounded mb-4"
          value={isRequired}
          onChange={(e) => setIsRequired(Number(e.target.value))}
        >
          <option value={1}>Required</option>
          <option value={0}>Optional</option>
        </select>

        <input
          className="w-full border p-3 rounded mb-4"
          type="number"
          placeholder="Display Order"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(Number(e.target.value))}
        />

        {needsOptions && (
          <div className="border p-4 rounded mb-4">
            <h3 className="font-bold mb-3">Options</h3>

            {options.map((option, index) => (
              <div key={index} className="flex gap-2 mb-3">
                <input
                  className="flex-1 border p-3 rounded"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  disabled={questionType === "true_false"}
                />

                {questionType !== "true_false" && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="bg-red-600 text-white px-3 rounded"
                  >
                    X
                  </button>
                )}
              </div>
            ))}

            {questionType !== "true_false" && (
              <button
                type="button"
                onClick={addOptionField}
                className="border px-4 py-2 rounded"
              >
                Add Option
              </button>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button className="bg-black text-white px-6 py-3 rounded">
            {editingId ? "Update Question" : "Add Question"}
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
        <h2 className="text-2xl font-bold mb-4">Current Questions</h2>

        <div className="space-y-4">
          {questions.map((question) => (
            <div key={question.id} className="border p-4 rounded-lg">
              <p className="text-sm text-gray-500">
                Type: {question.question_type} | Required:{" "}
                {question.is_required ? "Yes" : "No"} | Order:{" "}
                {question.display_order}
              </p>

              <h3 className="font-bold text-lg mt-1 mb-3">
                {question.question_text}
              </h3>

              {question.options && question.options.length > 0 && (
                <ul className="list-disc ml-6 mt-2 text-gray-600">
                  {question.options.map((option) => (
                    <li key={option.id}>{option.option_text}</li>
                  ))}
                </ul>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => startEdit(question)}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(question.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {questions.length === 0 && (
            <p className="text-gray-500">No questions found.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default ManageQuizQuestions;