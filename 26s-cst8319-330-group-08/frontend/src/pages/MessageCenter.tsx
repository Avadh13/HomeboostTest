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
  assigned_member_name?: string | null;
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

const readUser = (): CurrentUser => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "No date";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const roleLabel = (role?: string) => (role || "user").replace(/_/g, " ");

const getRoleMeta = (role?: string) => {
  if (role === "employee") {
    return {
      title: "Employee Messages",
      subtitle: "One-to-one private conversations with your advisor, company contact, or HomeBoost support.",
      homePath: "/employee-portal",
    };
  }

  if (role === "company_admin" || role === "company") {
    return {
      title: "Company Messages",
      subtitle: "One-to-one private conversations with employees, HBT contacts, or HomeBoost support.",
      homePath: "/company/dashboard",
    };
  }

  if (role === "hbt_member") {
    return {
      title: "Advisor Messages",
      subtitle: "One-to-one private conversations with clients, company managers, team members, or support.",
      homePath: "/hbt/member-dashboard",
    };
  }

  if (role === "hbt_admin") {
    return {
      title: "HBT Admin Messages",
      subtitle: "One-to-one private conversations only. Team-wide visibility is disabled.",
      homePath: "/hbt/dashboard",
    };
  }

  return {
    title: "Admin Messages",
    subtitle: "One-to-one private platform support conversations.",
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");
  const user = readUser();
  const meta = getRoleMeta(user.role);
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const canManageStatus = user.role !== "employee";

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

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
      await loadThreads();
    } catch {
      toast.error("Failed to load conversation.");
    }
  };

  useEffect(() => {
    loadThreads();
    loadContacts();
  }, []);

  const selectedRecipient = contacts.find((contact) => String(contact.id) === selectedRecipientId);

  const getOtherPerson = (thread: Thread) => {
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

  const filteredThreads = useMemo(() => {
    const search = searchText.toLowerCase().trim();

    return threads.filter((thread) => {
      const other = getOtherPerson(thread);
      const matchesSearch =
        !search ||
        [thread.subject, other.name, other.email, thread.company_name, thread.hbt_team_name, thread.last_message]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesStatus = statusFilter === "all" || thread.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [threads, searchText, statusFilter, user.id]);

  const unreadTotal = threads.reduce((sum, thread) => sum + Number(thread.unread_count || 0), 0);
  const openTotal = threads.filter((thread) => thread.status === "open").length;
  const pendingTotal = threads.filter((thread) => thread.status === "pending").length;

  const getStatusClass = (status: string) => {
    if (status === "closed") return "bg-emerald-100 text-emerald-700";
    if (status === "pending") return "bg-amber-100 text-amber-700";
    return "bg-blue-100 text-blue-700";
  };

  const createThread = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedRecipient) {
      toast.warning("Please select one person to message.");
      return;
    }

    if (!subject.trim() || !messageBody.trim()) {
      toast.warning("Subject and message are required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/messages/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: subject.trim(),
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
      await loadThreads();
      if (data.thread_id) await loadThreadDetails(data.thread_id);
      toast.success("Private conversation started.");
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
        body: JSON.stringify({ message_body: replyBody }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to send reply.");
        return;
      }

      setReplyBody("");
      await loadThreadDetails(selected.thread.id);
      toast.success("Reply sent.");
    } catch {
      toast.error("Failed to send reply.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (threadId: number, status: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/threads/${threadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to update status.");
        return;
      }

      await loadThreads();
      if (selected?.thread.id === threadId) await loadThreadDetails(threadId);
      toast.success("Conversation status updated.");
    } catch {
      toast.error("Failed to update status.");
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
    if (!confirm("Delete this full conversation? This removes all messages in this thread.")) return;

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

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <main className="theme-page min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 md:py-8">
        <header className="theme-panel">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <Link to={meta.homePath} className="text-sm font-black text-violet-200 hover:text-white">← Back to Dashboard</Link>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-violet-200">Private Messaging</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{meta.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">{meta.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/notifications" className="rounded-full border border-white/30 px-4 py-2 text-sm font-black text-white hover:bg-white/10">Notifications</Link>
              <button onClick={logout} className="rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700">Logout</button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-4">
          {[
            ["Private Chats", threads.length, "text-violet-700", "bg-violet-50"],
            ["Unread", unreadTotal, "text-red-700", "bg-red-50"],
            ["Open", openTotal, "text-blue-700", "bg-blue-50"],
            ["Pending", pendingTotal, "text-amber-700", "bg-amber-50"],
          ].map(([label, value, textTone, bgTone]) => (
            <div key={String(label)} className="metric-card">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
              <h2 className={`mt-2 rounded-2xl px-3 py-2 text-3xl font-black ${textTone} ${bgTone}`}>{value}</h2>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <form onSubmit={createThread} className="premium-card border-2 border-violet-100">
            <p className="eyebrow">New private chat</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Message One Person</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Every conversation is one-to-one. Only you and the selected person can see it.</p>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Select person</span>
              <select className="form-field" value={selectedRecipientId} onChange={(event) => setSelectedRecipientId(event.target.value)}>
                <option value="">Choose one person...</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name} — {contact.title || roleLabel(contact.role)}{contact.company_name ? ` (${contact.company_name})` : ""}{contact.is_online ? " • Online" : ""}
                  </option>
                ))}
              </select>
            </label>

            {contacts.length === 0 && <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">No available contacts found for this account.</p>}

            <div className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
              <input className="form-field" placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
              <textarea className="form-field min-h-[140px]" placeholder="Write your private message..." value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
              <button disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Sending..." : "Send Private Message"}</button>
            </div>
          </form>

          <section className="premium-card overflow-hidden border-2 border-slate-100 p-0">
            <div className="border-b border-slate-100 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Private inbox</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">One-to-One Conversations</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">Showing {filteredThreads.length} of {threads.length}</p>
                </div>
                <button onClick={loadThreads} className="btn-secondary">Refresh</button>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <input className="form-field" placeholder="Search private chats..." value={searchText} onChange={(event) => setSearchText(event.target.value)} />
                <select className="form-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="grid min-h-[620px] xl:grid-cols-[0.92fr_1.08fr]">
              <div className="max-h-[720px] overflow-y-auto border-b border-slate-100 xl:border-b-0 xl:border-r">
                {loading ? (
                  <p className="p-5 text-sm font-bold text-slate-500">Loading conversations...</p>
                ) : filteredThreads.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No private conversations found.</div>
                ) : (
                  filteredThreads.map((thread) => {
                    const other = getOtherPerson(thread);

                    return (
                      <button key={thread.id} onClick={() => loadThreadDetails(thread.id)} className={`block w-full border-b p-4 text-left transition hover:bg-violet-50/60 ${selected?.thread.id === thread.id ? "bg-violet-50" : "bg-white"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-950">{thread.subject}</p>
                            <p className="mt-1 text-sm text-slate-500">With {other.name} • {roleLabel(other.role)}</p>
                            {thread.company_name && <p className="text-xs font-semibold text-slate-400">{thread.company_name}</p>}
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(thread.status)}`}>{thread.status}</span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-slate-600">{thread.last_message || "No messages yet."}</p>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400"><span>{formatDateTime(thread.last_message_at)}</span>{Number(thread.unread_count || 0) > 0 && <span className="rounded-full bg-red-600 px-2 py-1 font-bold text-white">{thread.unread_count} unread</span>}</div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="border-l border-slate-100 bg-slate-50 p-5">
                {!selected ? (
                  <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-3xl font-black text-violet-700">✉</div>
                    <h2 className="text-2xl font-black text-slate-950">Select a private chat</h2>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">Choose a thread from the list or start a new private message.</p>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[560px] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="border-b border-slate-200 pb-4">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div>
                          <h2 className="text-2xl font-black text-slate-950">{selected.thread.subject}</h2>
                          <p className="mt-1 text-sm text-slate-500">Private chat with {getOtherPerson(selected.thread).name} • {roleLabel(getOtherPerson(selected.thread).role)}</p>
                          {selected.thread.company_name && <p className="text-sm text-slate-500">Company: {selected.thread.company_name}</p>}
                          {selected.thread.hbt_team_name && <p className="text-sm text-slate-500">HBT Team: {selected.thread.hbt_team_name}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {canManageStatus && (
                            <select className="rounded-xl border bg-white p-3 text-sm font-semibold" value={selected.thread.status} onChange={(event) => updateStatus(selected.thread.id, event.target.value)}>
                              <option value="open">Open</option>
                              <option value="pending">Pending</option>
                              <option value="closed">Closed</option>
                            </select>
                          )}
                          <button onClick={() => deleteThread(selected.thread.id)} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white hover:bg-red-700">Delete chat</button>
                        </div>
                      </div>
                    </div>

                    <div className="my-5 max-h-[480px] space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-3 pr-2">
                      {selected.messages.map((message) => {
                        const isMine = Number(message.sender_id) === Number(user.id);
                        const canDelete = isMine || isAdmin;

                        return (
                          <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[82%] rounded-2xl border p-4 shadow-sm ${isMine ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-xs font-bold capitalize opacity-80">{message.sender_name} • {roleLabel(message.sender_role)}</p>
                                {canDelete && <button onClick={() => deleteMessage(message.id)} className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isMine ? "bg-white/20 text-white" : "bg-red-50 text-red-600"}`}>Delete</button>}
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{message.message_body}</p>
                              <p className="mt-2 text-xs opacity-70">{formatDateTime(message.created_at)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={sendReply} className="mt-auto space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-3">
                      <textarea className="form-field min-h-[110px] bg-white" placeholder="Write a private reply..." value={replyBody} onChange={(event) => setReplyBody(event.target.value)} />
                      <button disabled={saving} className="btn-dark disabled:opacity-60">{saving ? "Sending..." : "Send Reply"}</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

export default MessageCenter;
