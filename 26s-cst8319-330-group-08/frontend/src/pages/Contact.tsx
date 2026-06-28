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
        headers: { "Content-Type": "application/json" },
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
    <main className="theme-page">
      <Navbar />

      <section className="relative px-6 py-16">
        <div className="floating-orb -left-24 top-20 h-80 w-80 bg-blue-400" />
        <div className="floating-orb right-0 top-40 h-96 w-96 bg-violet-400" />

        <div className="section-container grid items-stretch gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="theme-panel flex flex-col justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">Contact</p>
              <h1 className="mt-3 text-5xl font-black tracking-tight md:text-6xl">Let’s talk about the next employer portal.</h1>
              <p className="mt-5 text-lg leading-relaxed text-violet-100">
                Send a message for partnership questions, employer onboarding, or Home Buying Team support.
              </p>
            </div>
            <div className="mt-10 grid gap-3">
              {["Employer benefit setup", "Home Buying Team onboarding", "Portal support"].map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 px-4 py-3 font-bold text-violet-50 backdrop-blur">
                  ✓ {item}
                </div>
              ))}
            </div>
          </aside>

          <form onSubmit={handleSubmit} className="premium-card p-8 md:p-10">
            <p className="eyebrow">Message us</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight">Get in touch</h2>
            <p className="mt-3 text-slate-600">Send us a message and we will get back to you soon.</p>

            {notice && (
              <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                {notice.message}
              </div>
            )}

            <div className="mt-7 grid gap-4">
              <input className="form-field" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="form-field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input className="form-field" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <textarea className="form-field min-h-36" placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} required />
            </div>

            <button disabled={loading} className="btn-primary mt-6 disabled:opacity-60">
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Contact;
