import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";
import { useToast } from "../components/ToastProvider";

type Thread = {
  id: number;
  subject: string;
  employee_id?: number | null;
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
  updated_at?: string | null;
  created_at?: string | null;
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

type ContactUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  title?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  company_name?: string | null;
  hbt_team_name?: string | null;
  partnership_slug?: string | null;
  is_online?: boolean;
  last_seen_at?: string | null;
};

type PersonPreview = {
  id?: number | null;
  name: string;
  email?: string | null;
  role?: string | null;
  title?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  company_name?: string | null;
  hbt_team_name?: string | null;
  partnership_slug?: string | null;
  is_online?: boolean;
  last_seen_at?: string | null;
};

type ThreadDetails = { thread: Thread; messages: Message[] };
type MessageCenterProps = { embedded?: boolean };

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const roleLabel = (role?: string | null) => (role || "user").replace(/_/g, " ");
const initials = (name?: string | null) => (name || "User").trim().charAt(0).toUpperCase() || "U";
const formatTime = (value?: string | null) => value ? new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
const formatFullDate = (value?: string | null) => value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Offline";
const lastSeenLabel = (person: PersonPreview) => person.is_online ? "Online" : person.last_seen_at ? `Last seen ${formatFullDate(person.last_seen_at)}` : "Offline";

const getRoleMeta = (role?: string) => {
  if (role === "employee") return { title: "Messages", subtitle: "Private chats with your advisor, company contact, or support.", homePath: "/employee-portal" };
  if (role === "company_admin" || role === "company") return { title: "Messages", subtitle: "Private chats with employees, HBT contacts, or support.", homePath: "/company/dashboard" };
  if (role === "hbt_member") return { title: "Messages", subtitle: "Private chats with clients, company managers, team members, or support.", homePath: "/hbt/member-dashboard" };
  if (role === "hbt_admin") return { title: "Messages", subtitle: "One-to-one private conversations only.", homePath: "/hbt/dashboard" };
  return { title: "Messages", subtitle: "Private platform support conversations.", homePath: "/admin" };
};

function Avatar({ person, size = "md" }: { person: PersonPreview; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-10 w-10" : "h-12 w-12";
  return (
    <div className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-xl font-black text-blue-700 ring-1 ring-blue-200`}>
      {person.photo_url ? <img src={person.photo_url} alt={person.name} className="h-full w-full object-cover" /> : initials(person.name)}
      <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${person.is_online ? "bg-emerald-500" : "bg-slate-400"}`} />
    </div>
  );
}

function ContactInfoPopup({ person, onClose }: { person: PersonPreview; onClose: () => void }) {
  const rows = [
    ["✉", "Email", person.email || "Not provided"],
    ["👤", "Role", roleLabel(person.role)],
    ["💼", "Title", person.title || "Not provided"],
    ["🏢", "Company", person.company_name || "Not provided"],
    ["🏠", "HBT Team", person.hbt_team_name || "Not provided"],
    ["●", "Status", lastSeenLabel(person)],
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <section className="flex max-h-[86dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-700 hover:bg-slate-200">×</button>
            <h2 className="text-xl font-black">Contact info</h2>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-white">✎</button>
        </header>
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/70 via-white to-violet-50/70 px-5 pb-6">
          <div className="flex flex-col items-center pt-7 text-center">
            <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-5xl font-black text-white shadow-xl shadow-blue-500/25 ring-4 ring-white">
              {person.photo_url ? <img src={person.photo_url} alt={person.name} className="h-full w-full object-cover" /> : initials(person.name)}
              <span className={`absolute bottom-3 right-3 h-4 w-4 rounded-full border-[3px] border-white ${person.is_online ? "bg-emerald-500" : "bg-slate-400"}`} />
            </div>
            <h1 className="mt-4 text-3xl font-black">{person.name}</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">{person.phone || person.email || roleLabel(person.role)}</p>
            <p className={`mt-1 text-xs font-black ${person.is_online ? "text-emerald-600" : "text-slate-400"}`}>{lastSeenLabel(person)}</p>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-5">
            <p className="text-sm font-black text-slate-500">About</p>
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {rows.map(([icon, label, value], index) => (
                <div key={label} className={`flex gap-4 px-5 py-4 ${index !== rows.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <span className="w-7 text-xl text-slate-400">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MessageCenter({ embedded = false }: MessageCenterProps) {
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
  const [profilePerson, setProfilePerson] = useState<PersonPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");
  const user = readUser();
  const meta = getRoleMeta(user.role);
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const authHeaders = useMemo<Record<string, string>>(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const contactById = useMemo(() => {
    const map = new Map<number, ContactUser>();
    contacts.forEach((contact) => map.set(Number(contact.id), contact));
    return map;
  }, [contacts]);

  const personFromContact = (contact: ContactUser): PersonPreview => ({
    id: contact.id,
    name: contact.full_name,
    email: contact.email,
    role: contact.role,
    title: contact.title,
    phone: contact.phone,
    company_name: contact.company_name,
    hbt_team_name: contact.hbt_team_name,
    partnership_slug: contact.partnership_slug,
    photo_url: contact.photo_url || null,
    is_online: Boolean(contact.is_online),
    last_seen_at: contact.last_seen_at,
  });

  const getOtherPerson = (thread: Thread): PersonPreview => {
    const otherId = Number(thread.created_by) === Number(user.id) ? thread.recipient_id : thread.created_by;
    const contact = otherId ? contactById.get(Number(otherId)) : undefined;
    if (contact) return personFromContact(contact);
    if (Number(thread.created_by) === Number(user.id)) return { id: thread.recipient_id, name: thread.recipient_name || "Recipient", email: thread.recipient_email, role: thread.recipient_role };
    return { id: thread.created_by, name: thread.created_by_name || thread.employee_name || "Sender", email: thread.created_by_email || thread.employee_email, role: thread.created_by_role };
  };

  const contactKeyForThread = (thread: Thread) => {
    const other = getOtherPerson(thread);
    return String(other.id || other.email || other.name || thread.id).toLowerCase();
  };

  const selectedRecipient = contacts.find((contact) => String(contact.id) === selectedRecipientId);

  const filteredThreads = useMemo(() => {
    const search = searchText.toLowerCase().trim();
    const seenContacts = new Set<string>();

    return [...threads]
      .sort((left, right) => new Date(right.last_message_at || right.updated_at || right.created_at || 0).getTime() - new Date(left.last_message_at || left.updated_at || left.created_at || 0).getTime())
      .filter((thread) => {
        const other = getOtherPerson(thread);
        const searchable = [thread.subject, other.name, other.email, other.company_name, thread.hbt_team_name, thread.last_message].filter(Boolean).join(" ").toLowerCase();
        if (search && !searchable.includes(search)) return false;

        const contactKey = contactKeyForThread(thread);
        if (seenContacts.has(contactKey)) return false;

        seenContacts.add(contactKey);
        return true;
      });
  }, [threads, searchText, user.id, contactById]);

  const unreadTotal = threads.reduce((sum, thread) => sum + Number(thread.unread_count || 0), 0);

  const updatePresence = async () => {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/messages/presence`, { method: "POST", headers: authHeaders });
    } catch {
      // Presence should never block the message UI.
    }
  };

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
      const clickedThread = threads.find((thread) => Number(thread.id) === Number(threadId));
      const groupedThreads = clickedThread
        ? threads.filter((thread) => contactKeyForThread(thread) === contactKeyForThread(clickedThread))
        : threads.filter((thread) => Number(thread.id) === Number(threadId));

      const sortedGroup = (groupedThreads.length ? groupedThreads : [{ id: threadId } as Thread]).sort(
        (left, right) => new Date(left.last_message_at || left.updated_at || left.created_at || 0).getTime() - new Date(right.last_message_at || right.updated_at || right.created_at || 0).getTime()
      );

      const details = await Promise.all(sortedGroup.map(async (thread) => {
        const response = await fetch(`${API_BASE_URL}/messages/threads/${thread.id}`, { headers: authHeaders });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to load conversation.");
        return data as ThreadDetails;
      }));

      const mergedMessages = details
        .flatMap((detail) => detail.messages)
        .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());

      const latestDetail = details[details.length - 1];
      const latestThread = sortedGroup[sortedGroup.length - 1] || latestDetail.thread;
      setSelected({ thread: { ...latestDetail.thread, ...latestThread }, messages: mergedMessages });
      setShowNewChat(false);
      await loadThreads();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load conversation.");
    }
  };

  useEffect(() => {
    updatePresence();
    loadThreads();
    loadContacts();
    const presenceTimer = window.setInterval(updatePresence, 60_000);
    const refreshTimer = window.setInterval(() => { loadThreads(); loadContacts(); }, 90_000);
    return () => { window.clearInterval(presenceTimer); window.clearInterval(refreshTimer); };
  }, []);

  const createThread = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRecipient) return toast.warning("Please select one person to message.");
    if (!messageBody.trim()) return toast.warning("Message is required.");

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/messages/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: subject.trim() || `Chat with ${selectedRecipient.full_name}`, message_body: messageBody.trim(), recipient_id: selectedRecipient.id }),
      });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message || "Failed to create conversation.");
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
    if (!selected || !replyBody.trim()) return toast.warning("Reply message is required.");

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/messages/threads/${selected.thread.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message_body: replyBody.trim() }),
      });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message || "Failed to send reply.");
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
      if (!response.ok) return toast.error(data.message || "Failed to delete message.");
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
      if (!response.ok) return toast.error(data.message || "Failed to delete conversation.");
      setSelected(null);
      await loadThreads();
      toast.success("Conversation deleted.");
    } catch {
      toast.error("Failed to delete conversation.");
    }
  };

  const selectedOther = selected ? getOtherPerson(selected.thread) : null;
  const pageClass = embedded ? "text-slate-950" : "min-h-screen bg-[#e8eef7] text-slate-950";
  const shellClass = embedded ? "h-[calc(100dvh-190px)] rounded-[1.5rem] border border-slate-200" : "h-[calc(100dvh-76px)] border-x border-white/70";

  return (
    <main className={pageClass}>
      {!embedded && <Navbar />}
      <section className={`mx-auto flex ${shellClass} max-w-7xl overflow-hidden bg-white shadow-2xl shadow-slate-300/60`}>
        <aside className={`${selected ? "hidden md:flex" : "flex"} w-full flex-col border-r border-slate-200 bg-white md:w-[390px]`}>
          <div className="border-b border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {!embedded && <Link to={meta.homePath} className="text-xs font-black text-blue-600 hover:text-blue-800">← Dashboard</Link>}
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{meta.title}</h1>
                <p className="truncate text-xs font-semibold text-slate-500">{meta.subtitle}</p>
              </div>
              <button onClick={() => { setSelected(null); setShowNewChat(true); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-2xl font-black text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-700" title="New chat">+</button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-slate-100 px-4 py-3 ring-1 ring-slate-200">
              <span className="text-slate-400">⌕</span>
              <input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" placeholder="Search messages" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-400">
              <span>{filteredThreads.length} chats</span>
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
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.full_name} — {contact.title || roleLabel(contact.role)}{contact.company_name ? ` (${contact.company_name})` : ""}{contact.is_online ? " • Online" : " • Offline"}</option>)}
              </select>
              <input className="form-field mt-3 bg-white" placeholder="Subject optional" value={subject} onChange={(event) => setSubject(event.target.value)} />
              <textarea className="form-field mt-3 min-h-[100px] bg-white" placeholder="Write your first message..." value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
              <button disabled={saving} className="mt-3 w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 disabled:opacity-60">{saving ? "Sending..." : "Send Message"}</button>
            </form>
          )}

          <div className="flex-1 overflow-y-auto bg-white">
            {loading ? <div className="p-6 text-sm font-bold text-slate-500">Loading chats...</div> : filteredThreads.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">💬</div>
                <h2 className="text-xl font-black text-slate-950">No chats yet</h2>
                <p className="mt-2 text-sm text-slate-500">Start a private one-to-one conversation.</p>
                <button onClick={() => setShowNewChat(true)} className="mt-5 rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white">New chat</button>
              </div>
            ) : filteredThreads.map((thread) => {
              const other = getOtherPerson(thread);
              const active = selected?.thread.id === thread.id;
              return (
                <button key={thread.id} onClick={() => loadThreadDetails(thread.id)} className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition ${active ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}>
                  <Avatar person={other} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-black text-slate-950">{other.name}</p>
                      <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatDate(thread.last_message_at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-xs font-semibold capitalize text-blue-600">{roleLabel(other.role)}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${other.is_online ? "bg-emerald-500" : "bg-slate-400"}`} />
                      <span className={`text-[11px] font-bold ${other.is_online ? "text-emerald-600" : "text-slate-400"}`}>{other.is_online ? "Online" : "Offline"}</span>
                    </div>
                    <p className={`mt-1 truncate text-sm ${Number(thread.unread_count || 0) > 0 ? "font-black text-slate-900" : "text-slate-500"}`}>{thread.last_message || thread.subject}</p>
                  </div>
                </button>
              );
            })}
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
                <button type="button" onClick={() => setProfilePerson(selectedOther)} className="flex min-w-0 items-center gap-3 rounded-2xl p-1 text-left transition hover:bg-slate-50" title="View contact info">
                  <span onClick={(event) => { event.stopPropagation(); setSelected(null); }} className="rounded-full p-2 text-xl font-black text-slate-500 hover:bg-slate-100 md:hidden">‹</span>
                  <Avatar person={selectedOther} size="lg" />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-slate-950 md:text-lg">{selectedOther.name}</h2>
                    <p className="truncate text-xs font-bold capitalize text-slate-500">{roleLabel(selectedOther.role)}{selected.thread.company_name ? ` · ${selected.thread.company_name}` : ""}</p>
                    <p className={`text-[11px] font-black ${selectedOther.is_online ? "text-emerald-600" : "text-slate-400"}`}>{lastSeenLabel(selectedOther)}</p>
                  </div>
                  <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 md:inline-flex">Contact info</span>
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => { loadThreads(); loadContacts(); }} className="hidden rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 md:inline-flex">Refresh</button>
                  <button onClick={() => deleteThread(selected.thread.id)} className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-100">Delete</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_32%),linear-gradient(135deg,#eef5ff_0%,#f8fafc_42%,#eef2ff_100%)] px-4 py-5 md:px-8">
                <div className="mx-auto max-w-3xl space-y-4">
                  <div className="mx-auto w-fit rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">All conversations with {selectedOther.name}</div>
                  {selected.messages.map((message) => {
                    const isMine = Number(message.sender_id) === Number(user.id);
                    const canDelete = isMine || isAdmin;
                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`group max-w-[82%] md:max-w-[68%] ${isMine ? "items-end" : "items-start"}`}>
                          <div className={`rounded-3xl px-4 py-3 shadow-sm ${isMine ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200"}`}>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.message_body}</p>
                            <div className={`mt-2 flex items-center gap-2 text-[11px] ${isMine ? "justify-end text-blue-100" : "justify-start text-slate-400"}`}><span>{formatTime(message.created_at)}</span>{isMine && <span>✓✓</span>}</div>
                          </div>
                          <div className={`mt-1 flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <span className="text-[11px] font-semibold text-slate-400">{formatFullDate(message.created_at)}</span>
                            {canDelete && <button onClick={() => deleteMessage(message.id)} className="ml-2 text-[11px] font-black text-red-500 opacity-0 transition group-hover:opacity-100">Delete</button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={sendReply} className="sticky bottom-0 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:p-4">
                <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[2rem] bg-slate-100 p-2 ring-1 ring-slate-200">
                  <button type="button" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-white md:flex">＋</button>
                  <textarea className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm font-semibold outline-none placeholder:text-slate-400" placeholder={`Message ${selectedOther.name}...`} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
                  <button disabled={saving || !replyBody.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">➤</button>
                </div>
              </form>
            </>
          )}
        </section>
      </section>
      {profilePerson && <ContactInfoPopup person={profilePerson} onClose={() => setProfilePerson(null)} />}
    </main>
  );
}

export default MessageCenter;
