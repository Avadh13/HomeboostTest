import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";
import { useToast } from "../components/ToastProvider";

type Thread = {
  id: number;
  subject: string;
  employee_name?: string | null;
  employee_email?: string | null;
  company_name?: string | null;
  hbt_team_name?: string | null;
  recipient_id?: number | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  recipient_role?: string | null;
  created_by?: number;
  created_by_name?: string | null;
  created_by_email?: string | null;
  created_by_role?: string | null;
  status: string;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
};

type Message = {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  message_body: string;
  created_at: string;
};

type ThreadDetails = { thread: Thread; messages: Message[] };

type ContactUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  team_id?: number | null;
  partnership_id?: number | null;
  company_name?: string | null;
  hbt_team_name?: string | null;
  partnership_slug?: string | null;
  title?: string | null;
  is_online?: boolean;
};

type CurrentUser = {
  id?: number;
  full_name?: string;
  email?: string;
  role?: string;
};

type PersonPreview = {
  name: string;
  email?: string | null;
  role?: string | null;
};

const readUser = (): CurrentUser => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const roleLabel = (role?: string | null) => (role || "user").replace(/_/g, " ");

const initials = (name?: string | null) => {
  const value = (name || "User").trim();
  const parts = value.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "U";
};

const formatTime = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

const formatDate = (value?: string | null) => {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatFullDate = (value?: string | null) => {
  if (!value) return "No date";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getRoleMeta = (role?: string) => {
  if (role === "employee") {
    return {
      title: "Messages",
      subtitle: "Private chats with your advisor, company contact, or support.",
      homePath: "/employee-portal",
    };
  }

  if (role === "company_admin" || role === "company") {
    return {
      title: "Messages",
      subtitle: "Private chats with employees, HBT contacts, or support.",
      homePath: "/company/dashboard",
    };
  }

  if (role === "hbt_member") {
    return {
      title: "Messages",
      subtitle: "Private chats with clients, company managers, team members, or support.",
      homePath: "/hbt/member-dashboard",
    };
  }

  if (role === "hbt_admin") {
    return {
      title: "Messages",
      subtitle: "One-to-one private conversations only.",
      homePath: "/hbt/dashboard",
    };
  }

  return {
    title: "Messages",
    subtitle: "Private platform support conversations.",
    homePath: "/admin",
  };
};

function MessageCenter() {
  const toast = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<ThreadDetails | null>(null);
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");
  const user = readUser();
  const meta = getRoleMeta(user.role);
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const authHeaders = useMemo<Record<string, string>>(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const getOtherPerson = (thread: Thread): PersonPreview => {
    if (Number(thread.created_by) === Number(user.id)) {
      return {
        name: thread.recipient_name || "Recipient",
        email: thread.recipient_email,
        role: thread.recipient_role,
      };
    }

    return {
      name: thread.created_by_name || "Sender",
      email: thread.created_by_email,
      role: thread.created_by_role,
    };
  };

  const selectedRecipient = contacts.find((contact) => String(contact.id) === selectedRecipientId);

  const filteredThreads = useMemo(() => {
    const search = searchText.toLowerCase().trim();

    return threads.filter((thread) => {
      const other = getOtherPerson(thread);
      return (
        !search ||
        [thread.subject, other.name, other.email, thread.company_name, thread.hbt_team_name, thread.last_message]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [threads, searchText, user.id]);

  const unreadTotal = threads.reduce((sum, thread) => sum + Number(thread.unread_count || 0), 0);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/messages/threads`, { headers: authHeaders });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to load conversations.");
        setThreads([]);
        return;
      }

      setThreads(Array.isArray(data) ? data : []);
    } catch {
      setThreads([]);
      toast.error("Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/contacts`, { headers: authHeaders });
      const data = await response.json();
      setContacts(Array.isArray(data.users) ? data.users : []);
    } catch {
      setContacts([]);
    }
  };

  const loadThreadDetails = async (threadId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/threads/${threadId}`, { headers: authHeaders });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to load conversation.");
        return;
      }

      setSelected(data);
      setShowNewChat(false);
      await loadThreads();
    } catch {
      toast.error("Failed to load conversation.");
    }
  };

  useEffect(() => {
    loadThreads();
    loadContacts();
  }, []);

  const createThread = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedRecipient) {
      toast.warning("Please select one person to message.");
      return;
    }

    if (!messageBody.trim()) {
      toast.warning("Message is required.");
      return;
    }

    const finalSubject = subject.trim() || `Chat with ${selectedRecipient.full_name}`;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/messages/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: finalSubject,
          message_body: messageBody.trim(),
          recipient_id: selectedRecipient.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to create conversation.");
        return;
      }

      setSubject("");
      setMessageBody("");
      setSelectedRecipientId("");
      setShowNewChat(false);
      await loadThreads();
      if (data.thread_id) await loadThreadDetails(data.thread_id);
      toast.success("Private message sent.");
    } catch {
      toast.error("Failed to create conversation.");
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();

    if (!selected || !replyBody.trim()) {
      toast.warning("Reply message is required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/messages/threads/${selected.thread.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message_body: replyBody.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to send reply.");
        return;
      }

      setReplyBody("");
      await loadThreadDetails(selected.thread.id);
    } catch {
      toast.error("Failed to send reply.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!selected || !confirm("Delete this message?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, { method: "DELETE", headers: authHeaders });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Failed to delete message.");
        return;
      }

      await loadThreadDetails(selected.thread.id);
      toast.success("Message deleted.");
    } catch {
      toast.error("Failed to delete message.");
    }
  };

  const deleteThread = async (threadId: number) => {
    if (!confirm("Delete this full conversation?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/messages/threads/${threadId}`, { method: "DELETE", headers: authHeaders });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Failed to delete conversation.");
        return;
      }

      setSelected(null);
      await loadThreads();
      toast.success("Conversation deleted.");
    } catch {
      toast.error("Failed to delete conversation.");
    }
  };

  const selectedOther = selected ? getOtherPerson(selected.thread) : null;

  return (
    <main className="min-h-screen bg-[#e8eef7] text-slate-950">
      <Navbar />

      <section className="mx-auto flex h-[calc(100vh-76px)] max-w-7xl overflow-hidden border-x border-white/70 bg-white shadow-2xl shadow-slate-300/60">
        <aside className={`${selected ? "hidden md:flex" : "flex"} w-full flex-col border-r border-slate-200 bg-white md:w-[390px]`}>
          <div className="border-b border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Link to={meta.homePath} className="text-xs font-black text-blue-600 hover:text-blue-800">← Dashboard</Link>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{meta.title}</h1>
                <p className="text-xs font-semibold text-slate-500">{meta.subtitle}</p>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setShowNewChat(true);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-2xl font-black text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-700"
                title="New chat"
              >
                +
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-full bg-slate-100 px-4 py-3">
              <span className="text-slate-400">⌕</span>
              <input
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                placeholder="Search messages"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-400">
              <span>{threads.length} chats</span>
              {unreadTotal > 0 && <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">{unreadTotal} unread</span>}
            </div>
          </div>

          {showNewChat && (
            <form onSubmit={createThread} className="border-b border-slate-200 bg-blue-50/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-black text-slate-950">New private chat</h2>
                <button type="button" onClick={() => setShowNewChat(false)} className="rounded-full px-3 py-1 text-sm font-black text-slate-500 hover:bg-white">Close</button>
              </div>

              <select className="form-field bg-white" value={selectedRecipientId} onChange={(event) => setSelectedRecipientId(event.target.value)}>
                <option value="">Choose one person...</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name} — {contact.title || roleLabel(contact.role)}{contact.company_name ? ` (${contact.company_name})` : ""}
                  </option>
                ))}
              </select>

              <input
                className="form-field mt-3 bg-white"
                placeholder="Subject optional"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />

              <textarea
                className="form-field mt-3 min-h-[100px] bg-white"
                placeholder="Write your first message..."
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
              />

              <button disabled={saving} className="mt-3 w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}

          <div className="flex-1 overflow-y-auto bg-white">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl p-3">
                    <div className="h-12 w-12 rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 rounded bg-slate-100" />
                      <div className="h-3 w-full rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">💬</div>
                <h2 className="text-xl font-black text-slate-950">No chats yet</h2>
                <p className="mt-2 text-sm text-slate-500">Start a private one-to-one conversation.</p>
                <button onClick={() => setShowNewChat(true)} className="mt-5 rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white">New chat</button>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const other = getOtherPerson(thread);
                const active = selected?.thread.id === thread.id;

                return (
                  <button
                    key={thread.id}
                    onClick={() => loadThreadDetails(thread.id)}
                    className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition ${active ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
                  >
                    <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white shadow-md">
                      {initials(other.name)}
                      {Number(thread.unread_count || 0) > 0 && <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-red-500" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-black text-slate-950">{other.name}</p>
                        <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatDate(thread.last_message_at)}</span>
                      </div>
                      <p className="truncate text-xs font-semibold capitalize text-blue-600">{roleLabel(other.role)}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">{thread.last_message || thread.subject}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className={`${selected ? "flex" : "hidden md:flex"} flex-1 flex-col bg-[#f5f8fc]`}>
          {!selected || !selectedOther ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white text-5xl shadow-xl shadow-slate-200">💬</div>
              <h2 className="text-3xl font-black text-slate-950">Select a chat</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">Choose a private conversation from the left side, or start a new one-to-one message.</p>
              <button onClick={() => setShowNewChat(true)} className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25">Start new chat</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <button onClick={() => setSelected(null)} className="rounded-full p-2 text-xl font-black text-slate-500 hover:bg-slate-100 md:hidden">‹</button>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white">
                    {initials(selectedOther.name)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-slate-950 md:text-lg">{selectedOther.name}</h2>
                    <p className="truncate text-xs font-bold capitalize text-slate-500">{roleLabel(selectedOther.role)}{selected.thread.company_name ? ` · ${selected.thread.company_name}` : ""}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={loadThreads} className="hidden rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 md:inline-flex">Refresh</button>
                  <button onClick={() => deleteThread(selected.thread.id)} className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-100">Delete</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_32%),linear-gradient(135deg,#eef5ff_0%,#f8fafc_42%,#eef2ff_100%)] px-4 py-5 md:px-8">
                <div className="mx-auto max-w-3xl space-y-4">
                  <div className="mx-auto w-fit rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">
                    {selected.thread.subject}
                  </div>

                  {selected.messages.map((message) => {
                    const isMine = Number(message.sender_id) === Number(user.id);
                    const canDelete = isMine || isAdmin;

                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`group max-w-[82%] md:max-w-[68%] ${isMine ? "items-end" : "items-start"}`}>
                          <div className={`rounded-3xl px-4 py-3 shadow-sm ${isMine ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200"}`}>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.message_body}</p>
                            <div className={`mt-2 flex items-center gap-2 text-[11px] ${isMine ? "justify-end text-blue-100" : "justify-start text-slate-400"}`}>
                              <span>{formatTime(message.created_at)}</span>
                              {isMine && <span>✓✓</span>}
                            </div>
                          </div>

                          <div className={`mt-1 flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <span className="text-[11px] font-semibold text-slate-400">{formatFullDate(message.created_at)}</span>
                            {canDelete && (
                              <button onClick={() => deleteMessage(message.id)} className="ml-2 text-[11px] font-black text-red-500 opacity-0 transition group-hover:opacity-100">
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={sendReply} className="border-t border-slate-200 bg-white p-3 md:p-4">
                <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[2rem] bg-slate-100 p-2 ring-1 ring-slate-200">
                  <button type="button" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-white md:flex">＋</button>
                  <textarea
                    className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm font-semibold outline-none placeholder:text-slate-400"
                    placeholder="Message..."
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button disabled={saving || !replyBody.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                    ➤
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default MessageCenter;
