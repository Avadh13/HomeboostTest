import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

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

function MessageCenter() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<ThreadDetails | null>(null);
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isEmployee = user.role === "employee";
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const isHbtUser = user.role === "hbt_admin" || user.role === "hbt_member";

  const homePath = isEmployee
    ? "/employee-portal"
    : isAdmin
    ? "/admin"
    : user.role === "hbt_member"
    ? "/hbt/member-dashboard"
    : "/hbt/dashboard";

  const portalLabel = isEmployee
    ? "Employee Message Center"
    : isAdmin
    ? "Admin Message Center"
    : user.role === "hbt_member"
    ? "HBT Member Message Center"
    : "HBT Admin Message Center";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const loadThreads = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/messages/threads`, {
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load messages");
        setThreads([]);
        return;
      }

      setThreads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load messages:", error);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  const loadThreadDetails = async (threadId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/messages/threads/${threadId}`,
        {
          headers: authHeaders,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load conversation");
        return;
      }

      setSelected(data);
      loadThreads();
    } catch (error) {
      console.error("Failed to load thread:", error);
      alert("Failed to load conversation");
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const createThread = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !messageBody.trim()) {
      alert("Subject and message are required");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/messages/threads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          message_body: messageBody,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to create message");
        return;
      }

      setSubject("");
      setMessageBody("");
      await loadThreads();

      if (data.thread_id) {
        loadThreadDetails(data.thread_id);
      }
    } catch (error) {
      console.error("Failed to create message:", error);
      alert("Failed to create message");
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selected || !replyBody.trim()) {
      alert("Reply message is required");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/messages/threads/${selected.thread.id}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message_body: replyBody,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to send reply");
        return;
      }

      setReplyBody("");
      loadThreadDetails(selected.thread.id);
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("Failed to send reply");
    }
  };

  const updateStatus = async (threadId: number, status: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/messages/threads/${threadId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to update status");
        return;
      }

      await loadThreads();

      if (selected?.thread.id === threadId) {
        loadThreadDetails(threadId);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status");
    }
  };

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      const search = searchText.toLowerCase().trim();

      const matchesSearch =
        !search ||
        thread.subject?.toLowerCase().includes(search) ||
        thread.employee_name?.toLowerCase().includes(search) ||
        thread.employee_email?.toLowerCase().includes(search) ||
        thread.company_name?.toLowerCase().includes(search) ||
        thread.hbt_team_name?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || thread.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [threads, searchText, statusFilter]);

  const getStatusClass = (status: string) => {
    if (status === "closed") return "bg-green-100 text-green-700";
    if (status === "pending") return "bg-yellow-100 text-yellow-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to={homePath} className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 font-black text-white">
              HB
            </span>

            <div>
              <p className="text-2xl font-black text-slate-950">HomeBoost</p>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                {portalLabel}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-bold text-slate-950">
                {user.full_name || "User"}
              </p>
              <p className="text-xs font-bold uppercase text-slate-500">
                {user.role || "Role"}
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <Link
            to={homePath}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </Link>

          <section className="rounded-3xl bg-gradient-to-r from-slate-950 to-blue-950 p-8 text-white shadow-xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
              Secure Messaging
            </p>

            <h1 className="mt-3 text-4xl font-black">Message Center</h1>

            <p className="mt-3 max-w-3xl text-blue-100">
              Send and receive messages inside the HomeBoost platform.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Total Threads</p>
                <p className="mt-1 text-3xl font-black">{threads.length}</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Open</p>
                <p className="mt-1 text-3xl font-black">
                  {threads.filter((t) => t.status === "open").length}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Unread</p>
                <p className="mt-1 text-3xl font-black">
                  {threads.reduce(
                    (sum, t) => sum + Number(t.unread_count || 0),
                    0
                  )}
                </p>
              </div>
            </div>
          </section>

          {isEmployee && (
            <form
              onSubmit={createThread}
              className="grid gap-4 rounded-3xl bg-white p-6 shadow"
            >
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Start New Conversation
                </h2>
                <p className="text-sm text-slate-500">
                  Your message will go to your assigned HBT team.
                </p>
              </div>

              <input
                className="rounded-xl border p-3"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />

              <textarea
                className="min-h-[120px] rounded-xl border p-3"
                placeholder="Write your message..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
              />

              <button className="w-fit rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700">
                Send Message
              </button>
            </form>
          )}

          <section className="rounded-3xl bg-white p-6 shadow">
            <div className="mb-5 grid gap-4 md:grid-cols-2">
              <input
                className="rounded-xl border p-3"
                placeholder="Search messages..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <select
                className="rounded-xl border p-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                <h2 className="text-xl font-black text-slate-950">
                  Conversations
                </h2>

                {loading ? (
                  <p className="text-slate-500">Loading messages...</p>
                ) : filteredThreads.length === 0 ? (
                  <p className="text-slate-500">No conversations found.</p>
                ) : (
                  filteredThreads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => loadThreadDetails(thread.id)}
                      className={`block w-full rounded-2xl border p-4 text-left hover:bg-slate-50 ${
                        selected?.thread.id === thread.id
                          ? "border-blue-500 bg-blue-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">
                            {thread.subject}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {thread.employee_name || "Employee"}{" "}
                            {thread.company_name &&
                              `• ${thread.company_name}`}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            thread.status
                          )}`}
                        >
                          {thread.status}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                        {thread.last_message || "No messages yet."}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {thread.last_message_at
                            ? new Date(thread.last_message_at).toLocaleString()
                            : ""}
                        </span>

                        {Number(thread.unread_count || 0) > 0 && (
                          <span className="rounded-full bg-red-600 px-2 py-1 font-bold text-white">
                            {thread.unread_count} unread
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="rounded-3xl border bg-slate-50 p-5">
                {!selected ? (
                  <p className="text-slate-500">
                    Select a conversation to view messages.
                  </p>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="border-b pb-4">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div>
                          <h2 className="text-2xl font-black text-slate-950">
                            {selected.thread.subject}
                          </h2>

                          <p className="mt-1 text-sm text-slate-500">
                            Employee:{" "}
                            {selected.thread.employee_name || "N/A"}{" "}
                            {selected.thread.employee_email &&
                              `(${selected.thread.employee_email})`}
                          </p>

                          <p className="text-sm text-slate-500">
                            Company: {selected.thread.company_name || "N/A"}
                          </p>
                        </div>

                        {(isHbtUser || isAdmin) && (
                          <select
                            className="rounded-xl border bg-white p-3 text-sm font-semibold"
                            value={selected.thread.status}
                            onChange={(e) =>
                              updateStatus(selected.thread.id, e.target.value)
                            }
                          >
                            <option value="open">Open</option>
                            <option value="pending">Pending</option>
                            <option value="closed">Closed</option>
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="my-5 max-h-[480px] space-y-4 overflow-y-auto pr-2">
                      {selected.messages.map((message) => {
                        const isMine = Number(message.sender_id) === Number(user.id);

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              isMine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl p-4 ${
                                isMine
                                  ? "bg-blue-600 text-white"
                                  : "bg-white text-slate-800"
                              }`}
                            >
                              <p className="text-xs font-bold opacity-80">
                                {message.sender_name} • {message.sender_role}
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-sm">
                                {message.message_body}
                              </p>

                              <p className="mt-2 text-xs opacity-70">
                                {new Date(message.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={sendReply} className="mt-auto space-y-3">
                      <textarea
                        className="min-h-[100px] w-full rounded-xl border bg-white p-3"
                        placeholder="Write a reply..."
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                      />

                      <button className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white hover:bg-black">
                        Send Reply
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default MessageCenter;