import { useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

function Contact() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || `Message failed with status ${response.status}` });
        return;
      }

      setNotice({ type: "success", message: "Message sent successfully. We will get back to you soon." });
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (error) {
      console.error("Contact submit error:", error);
      setNotice({ type: "error", message: "Could not send message. Please try again later." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow">
          <p className="text-sm font-semibold tracking-wide text-gray-500 uppercase mb-3">
            Contact
          </p>

          <h1 className="text-4xl font-bold mb-4">Get in touch</h1>

          <p className="text-gray-600 mb-8">
            Send us a message and we will get back to you soon.
          </p>

          {notice && (
            <div
              className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {notice.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input
              className="w-full border p-3 rounded mb-4"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <input
              className="w-full border p-3 rounded mb-4"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="w-full border p-3 rounded mb-4"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <textarea
              className="w-full border p-3 rounded mb-4 min-h-32"
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />

            <button disabled={loading} className="bg-black text-white px-6 py-3 rounded-lg disabled:opacity-60">
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Contact;
