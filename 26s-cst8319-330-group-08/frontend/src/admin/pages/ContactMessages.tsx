import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import ChatWidget from "../../components/ChatWidget";
import { useToast } from "../../components/ToastProvider";

type ContactMessage = {
  id: number;
  full_name: string;
  name?: string;
  email: string;
  phone: string;
  message: string;
  is_read: number;
  created_at: string;
};

function ContactMessages() {
  const toast = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const unreadCount = messages.filter((message) => Number(message.is_read) === 0).length;

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();

    return messages.filter((msg) => {
      const senderName = msg.full_name || msg.name || "";
      const matchesSearch =
        !query ||
        senderName.toLowerCase().includes(query) ||
        msg.email?.toLowerCase().includes(query) ||
        msg.phone?.toLowerCase().includes(query) ||
        msg.message?.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "unread" && Number(msg.is_read) === 0) ||
        (statusFilter === "read" && Number(msg.is_read) === 1);

      return matchesSearch && matchesStatus;
    });
  }, [messages, search, statusFilter]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/contact`);
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Messages load error:", error);
      toast.error("Failed to load contact messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/contact/${id}/read`, { method: "PUT" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Failed to mark message read.");
        return;
      }

      toast.success("Message marked as read.");
      loadMessages();
    } catch (error) {
      console.error("Mark read error:", error);
      toast.error("Could not mark message as read.");
    }
  };

  const deleteMessage = async (message: ContactMessage) => {
    const confirmDelete = confirm(`Delete message from ${message.full_name || message.name || message.email}?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/contact/${message.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Delete failed.");
        return;
      }

      toast.success("Message deleted.");
      setSelectedMessage(null);
      loadMessages();
    } catch (error) {
      console.error("Delete message error:", error);
      toast.error("Could not delete message.");
    }
  };

  const markAllVisibleRead = async () => {
    const unreadVisible = filteredMessages.filter((message) => Number(message.is_read) === 0);
    if (unreadVisible.length === 0) {
      toast.info("No unread visible messages.");
      return;
    }

    await Promise.all(unreadVisible.map((message) => fetch(`${API_BASE_URL}/contact/${message.id}/read`, { method: "PUT" })));
    toast.success("Visible messages marked as read.");
    loadMessages();
  };

  return (
    <AdminLayout title="Contact Messages">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Inbox</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Contact message center</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Review employer and employee inquiries, filter unread messages, and keep the admin inbox clean.
          </p>
          <button type="button" onClick={markAllVisibleRead} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">
            Mark Visible Read
          </button>
        </div>

        <div className="premium-card">
          <p className="eyebrow">Inbox stats</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3">
              <p className="text-2xl font-black text-violet-700">{messages.length}</p>
              <p className="text-[11px] font-bold text-slate-500">Total</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-3">
              <p className="text-2xl font-black text-red-700">{unreadCount}</p>
              <p className="text-[11px] font-bold text-slate-500">Unread</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="premium-card overflow-hidden p-0">
          <div className="border-b border-slate-100 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <input className="form-field" placeholder="Search messages..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="form-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center font-bold text-slate-500">Loading messages...</div>
          ) : (
            <div className="max-h-[680px] overflow-y-auto">
              {filteredMessages.map((msg) => {
                const senderName = msg.full_name || msg.name || "Website Visitor";
                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => setSelectedMessage(msg)}
                    className={`block w-full border-b px-4 py-4 text-left transition hover:bg-violet-50/60 ${selectedMessage?.id === msg.id ? "bg-violet-50" : "bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{senderName}</p>
                        <p className="text-xs font-semibold text-slate-500">{msg.email}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${Number(msg.is_read) === 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {Number(msg.is_read) === 0 ? "Unread" : "Read"}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{msg.message || "No message preview"}</p>
                    <p className="mt-2 text-xs font-bold text-slate-400">{msg.created_at ? new Date(msg.created_at).toLocaleString() : "No date"}</p>
                  </button>
                );
              })}

              {filteredMessages.length === 0 && <div className="p-8 text-center text-slate-500">No messages found.</div>}
            </div>
          )}
        </div>

        <div className="premium-card min-h-[420px]">
          {selectedMessage ? (
            <div>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Message details</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedMessage.full_name || selectedMessage.name || "Website Visitor"}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString() : "No date"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${Number(selectedMessage.is_read) === 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {Number(selectedMessage.is_read) === 0 ? "Unread" : "Read"}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <a href={`mailto:${selectedMessage.email}`} className="rounded-2xl bg-slate-50 p-4 hover:bg-violet-50">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Email</p>
                  <p className="mt-1 break-all font-bold text-slate-700">{selectedMessage.email || "N/A"}</p>
                </a>
                <a href={selectedMessage.phone ? `tel:${selectedMessage.phone}` : undefined} className="rounded-2xl bg-slate-50 p-4 hover:bg-violet-50">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Phone</p>
                  <p className="mt-1 font-bold text-slate-700">{selectedMessage.phone || "N/A"}</p>
                </a>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Message</p>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">{selectedMessage.message || "No message content."}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {Number(selectedMessage.is_read) === 0 && <button onClick={() => markAsRead(selectedMessage.id)} className="btn-primary">Mark Read</button>}
                <a href={`mailto:${selectedMessage.email}`} className="btn-secondary">Reply by Email</a>
                <button onClick={() => deleteMessage(selectedMessage)} className="btn-danger">Delete</button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-3xl font-black text-violet-700">✉</div>
              <h2 className="text-2xl font-black text-slate-950">Select a message</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">Choose any message from the inbox list to review details, mark it read, reply by email, or delete it.</p>
            </div>
          )}
        </div>
      </div>
      <ChatWidget />
    </AdminLayout>
  );
}

export default ContactMessages;
