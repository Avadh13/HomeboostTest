import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";
import { useToast } from "../components/ToastProvider";

function Contact() {
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!fullName.trim() || !email.trim() || !message.trim()) {
      toast.warning("Name, email, and message are required.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), phone: phone.trim(), message: message.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messageText = data.message || `Message failed with status ${response.status}`;
        setNotice({ type: "error", message: messageText });
        toast.error(messageText);
        return;
      }
      setNotice({ type: "success", message: "Message sent successfully. We will follow up with next steps." });
      toast.success("Message sent successfully.");
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (error) {
      console.error("Contact submit error:", error);
      setNotice({ type: "error", message: "Could not send message. Please try again later." });
      toast.error("Could not send message. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="theme-page min-h-screen">
      <Navbar />
      <section className="relative px-4 py-10 md:px-6 md:py-14">
        <div className="floating-orb -left-24 top-20 h-80 w-80 bg-blue-400" />
        <div className="floating-orb right-0 top-40 h-96 w-96 bg-violet-400" />
        <div className="section-container grid items-stretch gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="theme-panel flex flex-col justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Discovery Call</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Talk about bringing the Home Buying Program to your market.</h1>
              <p className="mt-5 text-sm leading-relaxed text-violet-100 md:text-lg">Use this page if you are a prospective Home Buying Team and want to discuss program fit, enrollment, payment, training, and employer rollout.</p>
            </div>
            <div className="mt-10 grid gap-3">
              {["Program fit", "Enrollment and payment", "Employer rollout"].map((title) => (
                <div key={title} className="rounded-2xl bg-white/10 px-4 py-3 text-violet-50 backdrop-blur"><p className="font-black">✓ {title}</p></div>
              ))}
            </div>
          </aside>

          <section className="grid gap-5 xl:grid-cols-[1fr_0.76fr]">
            <form onSubmit={handleSubmit} className="premium-card p-6 md:p-8">
              <p className="eyebrow">Message us</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Request a discovery call</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">Tell us about your Home Buying Team and what you want to launch.</p>
              {notice && <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.message}</div>}
              <div className="mt-7 grid gap-4">
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Full name</span><input className="form-field" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Email</span><input className="form-field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Phone</span><input className="form-field" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
                </div>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Message</span><textarea className="form-field min-h-40" placeholder="Tell us about your team, market, and questions..." value={message} onChange={(e) => setMessage(e.target.value)} required /></label>
              </div>
              <button disabled={loading} className="btn-primary mt-6 w-full justify-center disabled:opacity-60">{loading ? "Sending..." : "Request Discovery Call"}</button>
            </form>
            <aside className="space-y-5">
              <div className="premium-card">
                <p className="eyebrow">Next steps</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">What happens next?</h3>
                <div className="mt-5 space-y-3">
                  {["We review your request", "We confirm program fit", "You can sign up and complete payment"].map((item, index) => <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700">{index + 1}</span><p className="font-bold text-slate-700">{item}</p></div>)}
                </div>
              </div>
              <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Ready now?</p>
                <h3 className="mt-3 text-2xl font-black">Start enrollment</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">Register your Home Buying Team and continue to checkout.</p>
                <Link to="/hbt-signup" className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-slate-100">Sign Up</Link>
              </div>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}

export default Contact;
