import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { useToast } from "../components/ToastProvider";

type Thread = {
  id: number;
  subject: string;
  employee_name?: string;
  employee_email?: string;
  company_name?: string;
  hbt_team_name?: string;
  assigned_member_name?: string;
  status: string;
  last_message?: string;
  last_message_at?: string;
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

type ThreadDetails = {
  thread: Thread;
  messages: Message[];
};

type ContactUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  team_id?: number | null;
  partnership_id?: number | null;
  company_name?: string | null;
  hbt_team_name?: string | null;
  title?: string | null;
  is_online?: boolean;
};

type QuickAction = {
  type: string;
  label: string;
  description: string;
  partnership_id?: number | null;
  hbt_team_id?: number | null;
};

function MessageCenter() {
  const toast = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<ThreadDetails | null>(null);
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [selectedQuickAction, setSelectedQuickAction] = useState("");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isEmployee = user.role === "employee";
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const isHbtUser = user.role === "hbt_admin" || user.role === "hbt_member";
  const homePath = isEmployee ? "/employee-portal" : isAdmin ? "/admin" : user.role === "hbt_member" ? "/hbt/member-dashboard" : "/hbt/dashboard";
  const portalLabel = isEmployee ? "Employee Communication Center" : isAdmin ? "Admin Communication Center" : user.role === "hbt_member" ? "HBT Member Communication Center" : "HBT Admin Communication Center";

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
      const actions = Array.isArray(data.quick_actions) ? data.quick_actions : [];
      setContacts(Array.isArray(data.users) ? data.users : []);
      setQuickActions(actions);
      setSelectedQuickAction(actions[0]?.type || "");
    } catch {
      setContacts([]);
      setQuickActions([]);
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
      loadThreads();
    } catch {
      toast.error("Failed to load conversation.");
    }
  };

  useEffect(() => {
    loadThreads();
    loadContacts();
  }, []);

  const selectedRecipient = contacts.find((contact) => String(contact.id) === selectedRecipientId);
  const selectedAction = quickActions.find((action) => action.type === selectedQuickAction);

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      const search = searchText.toLowerCase().trim();
      const matchesSearch = !search || [thread.subject, thread.employee_name, thread.employee_email, thread.company_name, thread.hbt_team_name, thread.assigned_member_name, thread.last_message].filter(Boolean).join(" ").toLowerCase().includes(search);
      const matchesStatus = statusFilter === "all" || thread.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [threads, searchText, statusFilter]);

  const unreadTotal = threads.reduce((sum, thread) => sum + Number(thread.unread_count || 0), 0);
  const openTotal = threads.filter((thread) => thread.status === "open").length;
  const pendingTotal = threads.filter((thread) => thread.status === "pending").length;

  const getStatusClass = (status: string) => {
    if (status === "closed") return "bg-emerald-100 text-emerald-700";
    if (status === "pending") return "bg-amber-100 text-amber-700";
    return "bg-blue-100 text-blue-700";
  };

  const createThread = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !messageBody.trim()) {
      toast.warning("Subject and message are required.");
      return;
    }

    const bodyData: Record<string, unknown> = {
      subject: subject.trim(),
      message_body: messageBody.trim(),
    };

    if (selectedRecipient) {
      bodyData.recipient_id = selectedRecipient.id;
      if (selectedRecipient.role === "employee") {
        bodyData.employee_id = selectedRecipient.id;
        bodyData.partnership_id = selectedRecipient.partnership_id || null;
      }
      if (selectedRecipient.role === "hbt_member" || selectedRecipient.role === "hbt_admin") {
        bodyData.assigned_member_id = selectedRecipient.id;
      }
    } else if (selectedAction) {
      bodyData.contact_type = selectedAction.type;
      if (selectedAction.partnership_id) bodyData.partnership_id = selectedAction.partnership_id;
      if (selectedAction.hbt_team_id) bodyData.hbt_team_id = selectedAction.hbt_team_id;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/messages/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(bodyData),
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
      if (data.thread_id) loadThreadDetails(data.thread_id);
      toast.success("Conversation started successfully.");
    } catch {
      toast.error("Failed to create conversation.");
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (selected?.thread.id === threadId) loadThreadDetails(threadId);
      toast.success("Conversation status updated.");
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <main className="theme-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="theme-panel">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <Link to={homePath} className="text-sm font-black text-violet-200 hover:text-white">← Back to Dashboard</Link>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-violet-200">Secure Communication</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Communication Center</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">{portalLabel}. Start conversations, reply, and track follow-up status in one place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/notifications" className="rounded-full border border-white/30 px-4 py-2 text-sm font-black text-white hover:bg-white/10">Notifications</Link>
              <button onClick={logout} className="rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700">Logout</button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-4">
          {[
            ["Threads", threads.length, "text-violet-700", "bg-violet-50"],
            ["Unread", unreadTotal, "text-red-700", "bg-red-50"],
            ["Open", openTotal, "text-blue-700", "bg-blue-50"],
            ["Pending", pendingTotal, "text-amber-700", "bg-amber-50"],
          ].map(([label, value, textTone, bgTone]) => (
            <div key={label} className="metric-card">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
              <h2 className={`mt-2 rounded-2xl px-3 py-2 text-3xl font-black ${textTone} ${bgTone}`}>{value}</h2>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <form onSubmit={createThread} className="premium-card">
            <p className="eyebrow">New conversation</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Start Message</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{isEmployee ? "Choose an advisor or message your HBT team." : isHbtUser ? "Choose an assigned client or team conversation." : "Choose a platform contact."}</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Quick route</span><select className="form-field" value={selectedQuickAction} onChange={(e) => { setSelectedQuickAction(e.target.value); setSelectedRecipientId(""); }}>{quickActions.length === 0 && <option value="">No quick routes</option>}{quickActions.map((action) => <option key={action.type} value={action.type}>{action.label}</option>)}</select></label>
              <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Specific contact</span><select className="form-field" value={selectedRecipientId} onChange={(e) => { setSelectedRecipientId(e.target.value); setSelectedQuickAction(""); }}><option value="">Use quick route / no specific contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.full_name} — {contact.title || contact.role.replace("_", " ")}{contact.company_name ? ` (${contact.company_name})` : ""}{contact.is_online ? " • Online" : ""}</option>)}</select></label>
            </div>

            {contacts.length === 0 && <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">No assigned contacts found yet. Use quick route to message the assigned team or support.</p>}

            <div className="mt-4 space-y-4">
              <input className="form-field" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea className="form-field min-h-[140px]" placeholder="Write your message..." value={messageBody} onChange={(e) => setMessageBody(e.target.value)} />
              <button disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Sending..." : "Send Message"}</button>
            </div>
          </form>

          <section className="premium-card overflow-hidden p-0">
            <div className="border-b border-slate-100 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Inbox</p><h2 className="mt-1 text-2xl font-black text-slate-950">Conversations</h2><p className="mt-1 text-sm font-bold text-slate-500">Showing {filteredThreads.length} of {threads.length}</p></div><button onClick={loadThreads} className="btn-secondary">Refresh</button></div>
              <div className="grid gap-3 md:grid-cols-[1fr_180px]"><input className="form-field" placeholder="Search conversations..." value={searchText} onChange={(e) => setSearchText(e.target.value)} /><select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All Status</option><option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option></select></div>
            </div>

            <div className="grid min-h-[620px] xl:grid-cols-[0.92fr_1.08fr]">
              <div className="max-h-[720px] overflow-y-auto border-b border-slate-100 xl:border-b-0 xl:border-r">
                {loading ? <p className="p-5 text-sm font-bold text-slate-500">Loading conversations...</p> : filteredThreads.length === 0 ? <div className="p-8 text-center text-slate-500">No conversations found.</div> : filteredThreads.map((thread) => (
                  <button key={thread.id} onClick={() => loadThreadDetails(thread.id)} className={`block w-full border-b p-4 text-left transition hover:bg-violet-50/60 ${selected?.thread.id === thread.id ? "bg-violet-50" : "bg-white"}`}>
                    <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{thread.subject}</p><p className="mt-1 text-sm text-slate-500">{thread.employee_name || "Employee"}{thread.company_name ? ` • ${thread.company_name}` : ""}{thread.assigned_member_name ? ` • Advisor: ${thread.assigned_member_name}` : ""}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(thread.status)}`}>{thread.status}</span></div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">{thread.last_message || "No messages yet."}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400"><span>{thread.last_message_at ? new Date(thread.last_message_at).toLocaleString() : ""}</span>{Number(thread.unread_count || 0) > 0 && <span className="rounded-full bg-red-600 px-2 py-1 font-bold text-white">{thread.unread_count} unread</span>}</div>
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 p-5">
                {!selected ? <div className="flex min-h-[500px] flex-col items-center justify-center text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-3xl font-black text-violet-700">✉</div><h2 className="text-2xl font-black text-slate-950">Select a conversation</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">Choose a thread from the list or start a new message using the form.</p></div> : (
                  <div className="flex h-full min-h-[560px] flex-col">
                    <div className="border-b border-slate-200 pb-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><h2 className="text-2xl font-black text-slate-950">{selected.thread.subject}</h2><p className="mt-1 text-sm text-slate-500">Employee: {selected.thread.employee_name || "N/A"} {selected.thread.employee_email && `(${selected.thread.employee_email})`}</p><p className="text-sm text-slate-500">Company: {selected.thread.company_name || "N/A"}</p>{selected.thread.assigned_member_name && <p className="text-sm text-slate-500">Advisor: {selected.thread.assigned_member_name}</p>}</div>{(isHbtUser || isAdmin) && <select className="rounded-xl border bg-white p-3 text-sm font-semibold" value={selected.thread.status} onChange={(e) => updateStatus(selected.thread.id, e.target.value)}><option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option></select>}</div></div>
                    <div className="my-5 max-h-[480px] space-y-4 overflow-y-auto pr-2">{selected.messages.map((message) => { const isMine = Number(message.sender_id) === Number(user.id); return <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl p-4 shadow-sm ${isMine ? "bg-blue-600 text-white" : "bg-white text-slate-800"}`}><p className="text-xs font-bold opacity-80">{message.sender_name} • {message.sender_role.replace("_", " ")}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{message.message_body}</p><p className="mt-2 text-xs opacity-70">{new Date(message.created_at).toLocaleString()}</p></div></div>; })}</div>
                    <form onSubmit={sendReply} className="mt-auto space-y-3"><textarea className="form-field min-h-[110px] bg-white" placeholder="Write a reply..." value={replyBody} onChange={(e) => setReplyBody(e.target.value)} /><button disabled={saving} className="btn-dark disabled:opacity-60">{saving ? "Sending..." : "Send Reply"}</button></form>
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

export default MessageCenter;
