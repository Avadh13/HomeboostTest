import { useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

function Contact() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: fullName,
        email,
        phone,
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert("Message sent successfully");

    setFullName("");
    setEmail("");
    setPhone("");
    setMessage("");
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

          <form onSubmit={handleSubmit}>
            <input
              className="w-full border p-3 rounded mb-4"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <input
              className="w-full border p-3 rounded mb-4"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            />

            <button className="bg-black text-white px-6 py-3 rounded-lg">
              Send Message
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Contact;