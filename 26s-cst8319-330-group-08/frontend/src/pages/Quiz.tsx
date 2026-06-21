import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type Quiz = {
  id: number;
  title: string;
  description: string;
  is_active: number;
  access_type?: string;
};

type QuizOption = {
  id: number;
  question_id: number;
  option_text: string;
  display_order: number;
};

type QuizQuestion = {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: string;
  is_required?: number;
  display_order: number;
  options?: QuizOption[];
};

type AnswerValue = {
  answer_text: string;
  selected_option_id?: number | null;
};

function Quiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(`${API_BASE_URL}/quizzes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setQuizzes([]);
          return;
        }

        setQuizzes(
          data.filter(
            (quiz: Quiz) =>
              Number(quiz.is_active) === 1 &&
              (!quiz.access_type || quiz.access_type === "public")
          )
        );
      })
      .catch((error) => {
        console.error("Failed to load quizzes:", error);
        alert("Failed to load quizzes");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, navigate]);

  useEffect(() => {
    if (!quizId || !token) return;

    fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setQuestions(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Failed to load quiz questions:", error);
        alert("Failed to load quiz questions");
      });
  }, [quizId, token]);

  const selectedQuiz = quizzes.find((quiz) => quiz.id === Number(quizId));

  const handleAnswerChange = (
    questionId: number,
    answerText: string,
    selectedOptionId: number | null = null
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        answer_text: answerText,
        selected_option_id: selectedOptionId,
      },
    }));
  };

  const handleCheckboxChange = (
    questionId: number,
    optionText: string,
    checked: boolean
  ) => {
    const currentAnswer = answers[questionId]?.answer_text || "";
    const currentItems = currentAnswer
      ? currentAnswer.split(", ").filter(Boolean)
      : [];

    const updatedItems = checked
      ? [...currentItems, optionText]
      : currentItems.filter((item) => item !== optionText);

    handleAnswerChange(questionId, updatedItems.join(", "));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      alert("Please login before submitting the quiz.");
      navigate("/login");
      return;
    }

    if (!quizId) {
      alert("Quiz ID missing.");
      return;
    }

    const formattedAnswers = Object.entries(answers).map(
      ([questionId, answer]) => ({
        question_id: Number(questionId),
        selected_option_id: answer.selected_option_id || null,
        answer_text: answer.answer_text,
      })
    );

    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/quizzes/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quiz_id: Number(quizId),
          answers: formattedAnswers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Quiz submit failed:", data);
        alert(data.message || "Failed to submit quiz");
        return;
      }

      alert("Quiz submitted successfully");
      setAnswers({});
      navigate("/employee-portal");
    } catch (error) {
      console.error("Quiz submit error:", error);
      alert("Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question: QuizQuestion) => {
    switch (question.question_type) {
      case "short_text":
      case "short_answer":
      case "email":
      case "phone":
        return (
          <input
            className="w-full border p-3 rounded mt-3"
            type={question.question_type === "email" ? "email" : "text"}
            placeholder="Your answer"
            required={Number(question.is_required) === 1}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          />
        );

      case "number":
      case "rating":
      case "linear_scale":
        return (
          <input
            className="w-full border p-3 rounded mt-3"
            type="number"
            placeholder="Enter number"
            required={Number(question.is_required) === 1}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          />
        );

      case "date":
        return (
          <input
            className="w-full border p-3 rounded mt-3"
            type="date"
            required={Number(question.is_required) === 1}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          />
        );

      case "paragraph":
        return (
          <textarea
            className="w-full border p-3 rounded mt-3 min-h-28"
            placeholder="Your answer"
            required={Number(question.is_required) === 1}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          />
        );

      case "multiple_choice":
      case "true_false":
        return (
          <div className="mt-3 space-y-2">
            {question.options?.map((option) => (
              <label key={option.id} className="flex gap-2 items-center">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  required={Number(question.is_required) === 1}
                  onChange={() =>
                    handleAnswerChange(
                      question.id,
                      option.option_text,
                      option.id
                    )
                  }
                />
                <span>{option.option_text}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="mt-3 space-y-2">
            {question.options?.map((option) => (
              <label key={option.id} className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  onChange={(e) =>
                    handleCheckboxChange(
                      question.id,
                      option.option_text,
                      e.target.checked
                    )
                  }
                />
                <span>{option.option_text}</span>
              </label>
            ))}
          </div>
        );

      case "dropdown":
        return (
          <select
            className="w-full border p-3 rounded mt-3"
            required={Number(question.is_required) === 1}
            onChange={(e) => {
              const selectedOption = question.options?.find(
                (option) => option.option_text === e.target.value
              );

              handleAnswerChange(
                question.id,
                e.target.value,
                selectedOption?.id || null
              );
            }}
          >
            <option value="">Select an option</option>
            {question.options?.map((option) => (
              <option key={option.id} value={option.option_text}>
                {option.option_text}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            className="w-full border p-3 rounded mt-3"
            placeholder="Your answer"
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          />
        );
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="p-10 text-center text-gray-600">Loading quizzes...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto text-center mb-10">
          <p className="text-sm font-semibold tracking-wide text-blue-600 uppercase mb-3">
            Employee Quiz
          </p>

          <h1 className="text-5xl font-extrabold mb-5">
            Homeownership Readiness Quiz
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Answer a few questions to help your Home Buying Team understand your
            goals and next steps.
          </p>
        </div>

        {!quizId && (
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-lg transition"
              >
                <h2 className="text-2xl font-bold mb-3">{quiz.title}</h2>

                <p className="text-gray-600 mb-6">{quiz.description}</p>

                <Link
                  to={`/quiz/${quiz.id}`}
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Start Quiz
                </Link>
              </div>
            ))}

            {quizzes.length === 0 && (
              <p className="text-gray-500">No quizzes available.</p>
            )}
          </div>
        )}

        {quizId && (
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow"
          >
            <h2 className="text-3xl font-bold mb-2">
              {selectedQuiz?.title || `Quiz #${quizId}`}
            </h2>

            <p className="text-gray-600 mb-8">
              {selectedQuiz?.description ||
                "Complete the questions below and submit your answers."}
            </p>

            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="border p-5 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">
                    Question {index + 1}
                    {Number(question.is_required) === 1
                      ? " • Required"
                      : " • Optional"}
                  </p>

                  <h3 className="text-lg font-bold">
                    {question.question_text}
                  </h3>

                  {renderQuestionInput(question)}
                </div>
              ))}
            </div>

            {questions.length === 0 && (
              <p className="text-gray-500">No questions found for this quiz.</p>
            )}

            {questions.length > 0 && (
              <button
                disabled={submitting}
                className="mt-8 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            )}
          </form>
        )}
      </section>
    </main>
  );
}

export default Quiz;