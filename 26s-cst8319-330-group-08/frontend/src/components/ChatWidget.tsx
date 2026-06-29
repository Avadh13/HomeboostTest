import { useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("Admin support request");
  const [messageBody, setMessageBody] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isLoggedIn = Boolean(token && user?.id);

  const messagesPath =
    user.role === "employee"
      ? "/employee/messages"
      : user.role === "admin" || user.role === "super_admin"
      ? "/admin/messages"
      : "/hbt/messages";

  const sendAdminSupport = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (!subject.trim() || !messageBody.trim()) {
      setNotice({ type: "error", message: "Subject and message are required." });
      return;
    }

    try {
      setSending(true);
      const response = await fetch(`${API_BASE_URL}/messages/threads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message_body: messageBody.trim(),
          contact_type: "admin",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Failed to send admin support request." });
        return;
      }

      setNotice({ type: "success", message: "Admin support request sent successfully." });
      setSubject("Admin support request");
      setMessageBody("");
    } catch (error) {
      console.error("Admin support send failed:", error);
      setNotice({ type: "error", message: "Failed to send admin support request." });
    } finally {
      setSending(false);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <>
      <button
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-2xl shadow-blue-500/40 transition hover:-translate-y-0.5 hover:bg-blue-700 md:bottom-6 md:right-6 md:h-16 md:w-16 md:text-3xl"
        title="Admin support"
        aria-label="Open admin support"
      >
        🛟
      </button>

      {open && (
        <div className="fixed bottom-20 left-3 right-3 z-50 max-h-[calc(100vh-6rem)] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:left-auto sm:right-6 sm:w-[420px] md:bottom-24">
          <div className="bg-gradient-to-r from-slate-950 to-blue-950 p-4 text-white md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Admin Support</p>
                <h2 className="mt-1 text-xl font-black md:text-2xl">Need platform help?</h2>
                <p className="mt-1 text-sm text-blue-100">Use this quick chat only for login, account, technical, or admin support issues.</p>
              </div>
              <button onClick={() => setOpen(false)} className="touch-target rounded-full bg-white/10 px-3 py-1 font-bold hover:bg-white/20" aria-label="Close admin support">
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-15rem)] overflow-y-auto p-4 md:max-h-[70vh] md:p-5">
            <div className="mb-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-950">{user.full_name || "User"}</p>
              <p className="text-xs font-semibold uppercase text-slate-500">{user.role}</p>
            </div>

            {notice && (
              <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                {notice.message}
              </div>
            )}

            <form onSubmit={sendAdminSupport} className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Sending to</p>
                <p className="mt-1 font-black text-slate-950">HomeBoost Admin Support</p>
                <p className="mt-1 text-sm text-slate-600">For platform problems, login help, account issues, or admin questions.</p>
              </div>

              <input className="form-field" placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
              <textarea className="form-field min-h-[120px]" placeholder="Describe the admin/support issue..." value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />

              <button disabled={sending} className="btn-primary w-full disabled:opacity-60">
                {sending ? "Sending..." : "Send to Admin Support"}
              </button>
            </form>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-950">Need employee/advisor communication?</p>
              <p className="mt-1 text-sm text-slate-600">Use the Communication Center for all regular conversations with employees, HBT members, or advisors.</p>
              <Link to={messagesPath} onClick={() => setOpen(false)} className="btn-dark mt-3 text-xs">
                Open Communication Center
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
