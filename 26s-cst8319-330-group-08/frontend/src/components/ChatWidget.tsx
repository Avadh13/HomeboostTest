import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { readStoredToken, readStoredUser } from "../utils/auth";
import { isAdminPath, isPortalPath } from "../utils/routes";

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("Admin support request");
  const [messageBody, setMessageBody] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const { pathname } = useLocation();
  const token = readStoredToken();
  const user = readStoredUser();
  const isLoggedIn = Boolean(token && user?.id);
  const shouldShow = Boolean(isLoggedIn && (isPortalPath(pathname) || isAdminPath(pathname)));

  const messagesPath =
    user?.role === "employee"
      ? "/employee/messages"
      : user?.role === "admin" || user?.role === "super_admin"
        ? "/admin/messages"
        : user?.role === "company_admin" || user?.role === "company"
          ? "/company/messages"
          : "/hbt/messages";

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setNotice(null);
  }, [pathname]);

  const sendAdminSupport = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (!token) {
      setNotice({ type: "error", message: "Your session has expired. Please sign in again." });
      return;
    }

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
    } catch {
      setNotice({ type: "error", message: "Failed to send admin support request." });
    } finally {
      setSending(false);
    }
  };

  if (!shouldShow || !user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-4 right-4 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-2xl shadow-blue-500/40 transition hover:-translate-y-0.5 hover:bg-blue-700 md:bottom-6 md:right-6 md:h-16 md:w-16 md:text-3xl"
        title="Admin support"
        aria-label={open ? "Close admin support" : "Open admin support"}
        aria-expanded={open}
      >
        🛟
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin support"
          className="fixed bottom-20 left-3 right-3 z-[90] max-h-[calc(100vh-6rem)] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:left-auto sm:right-6 sm:w-[420px] md:bottom-24"
        >
          <div className="bg-gradient-to-r from-slate-950 to-blue-950 p-4 text-white md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Admin Support</p>
                <h2 className="mt-1 text-xl font-black md:text-2xl">Need platform help?</h2>
                <p className="mt-1 text-sm text-blue-100">Use this form for login, account, technical, or administration problems.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="touch-target rounded-full bg-white/10 px-3 py-1 font-bold hover:bg-white/20" aria-label="Close admin support">
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-15rem)] overflow-y-auto p-4 md:max-h-[70vh] md:p-5">
            <div className="mb-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-950">{user.full_name || "User"}</p>
              <p className="text-xs font-semibold uppercase text-slate-500">{String(user.role || "user").replaceAll("_", " ")}</p>
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

              <input required maxLength={180} className="form-field" placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
              <textarea required maxLength={2000} className="form-field min-h-[120px]" placeholder="Describe the admin/support issue..." value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />

              <button type="submit" disabled={sending} className="btn-primary w-full disabled:opacity-60">
                {sending ? "Sending..." : "Send to Admin Support"}
              </button>
            </form>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-950">Need employee/advisor communication?</p>
              <p className="mt-1 text-sm text-slate-600">Use the Communication Center for normal employee, employer, and advisor conversations.</p>
              <Link to={messagesPath} onClick={() => setOpen(false)} className="btn-dark mt-3 text-xs">
                Open Workspace
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
