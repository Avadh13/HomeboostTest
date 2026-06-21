import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

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
  phone?: string | null;
  photo_url?: string | null;
  is_online: boolean;
  status_label: string;
  last_seen_at?: string | null;
};

type QuickAction = {
  type: string;
  label: string;
  description: string;
  partnership_id?: number | null;
  hbt_team_id?: number | null;
};

type ContactsResponse = {
  quick_actions: QuickAction[];
  users: ContactUser[];
};

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactsResponse>({
    quick_actions: [],
    users: [],
  });

  const [selectedContact, setSelectedContact] = useState<ContactUser | null>(
    null
  );
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(
    null
  );

  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
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

  const loadContacts = async () => {
    if (!token) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/messages/contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.log("Failed to load contacts:", data);
        return;
      }

      setContacts({
        quick_actions: Array.isArray(data.quick_actions)
          ? data.quick_actions
          : [],
        users: Array.isArray(data.users) ? data.users : [],
      });
    } catch (error) {
      console.log("Contact load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePresence = async () => {
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/messages/presence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    updatePresence();

    const interval = window.setInterval(() => {
      updatePresence();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!open) return;

    loadContacts();
  }, [open]);

  const filteredUsers = useMemo(() => {
    const search = searchText.toLowerCase().trim();

    if (!search) return contacts.users;

    return contacts.users.filter((contact) => {
      return (
        contact.full_name?.toLowerCase().includes(search) ||
        contact.email?.toLowerCase().includes(search) ||
        contact.role?.toLowerCase().includes(search) ||
        contact.company_name?.toLowerCase().includes(search) ||
        contact.hbt_team_name?.toLowerCase().includes(search)
      );
    });
  }, [contacts.users, searchText]);

  const resetCompose = () => {
    setSelectedContact(null);
    setSelectedAction(null);
    setSubject("");
    setMessageBody("");
  };

  const selectQuickAction = (action: QuickAction) => {
    setSelectedAction(action);
    setSelectedContact(null);

    if (action.type === "admin") {
      setSubject("Admin support request");
    } else if (action.type === "hbt_team") {
      setSubject("Message for my HBT team");
    } else {
      setSubject("");
    }
  };

  const selectContact = (contact: ContactUser) => {
    setSelectedContact(contact);
    setSelectedAction(null);
    setSubject(`Message for ${contact.full_name}`);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !messageBody.trim()) {
      alert("Subject and message are required");
      return;
    }

    try {
      setSending(true);

      const bodyData: any = {
        subject,
        message_body: messageBody,
      };

      if (selectedContact) {
        bodyData.recipient_id = selectedContact.id;

        if (selectedContact.role === "employee") {
          bodyData.employee_id = selectedContact.id;
          bodyData.partnership_id = selectedContact.partnership_id || null;
        }

        if (
          selectedContact.role === "hbt_member" ||
          selectedContact.role === "hbt_admin"
        ) {
          bodyData.assigned_member_id = selectedContact.id;
        }
      }

      if (selectedAction) {
        bodyData.contact_type = selectedAction.type;

        if (selectedAction.partnership_id) {
          bodyData.partnership_id = selectedAction.partnership_id;
        }
      }

      const response = await fetch(`${API_BASE_URL}/messages/threads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to send message");
        return;
      }

      alert("Message sent successfully");
      resetCompose();
      setOpen(false);
    } catch (error) {
      console.log("Send message error:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-3xl text-white shadow-2xl shadow-blue-500/40 hover:bg-blue-700"
        title="Open messages"
      >
        💬
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:w-[420px]">
          <div className="bg-gradient-to-r from-slate-950 to-blue-950 p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                  HomeBoost Chat
                </p>
                <h2 className="mt-1 text-2xl font-black">Contact Center</h2>
                <p className="mt-1 text-sm text-blue-100">
                  Contact admin, your HBT team, or a specific member.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-white/10 px-3 py-1 font-bold hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-5">
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="text-sm font-bold text-slate-950">
                  {user.full_name || "User"}
                </p>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {user.role}
                </p>
              </div>

              <Link
                to={messagesPath}
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-black"
              >
                View Inbox
              </Link>
            </div>

            {!selectedContact && !selectedAction && (
              <>
                <div className="space-y-3">
                  <h3 className="font-black text-slate-950">Quick Contact</h3>

                  {contacts.quick_actions.map((action) => (
                    <button
                      key={action.type + action.label}
                      onClick={() => selectQuickAction(action)}
                      className="block w-full rounded-2xl border p-4 text-left hover:border-blue-400 hover:bg-blue-50"
                    >
                      <p className="font-bold text-slate-950">
                        {action.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {action.description}
                      </p>
                    </button>
                  ))}

                  {contacts.quick_actions.length === 0 && !loading && (
                    <p className="text-sm text-slate-500">
                      No quick contact options found.
                    </p>
                  )}
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-black text-slate-950">People</h3>

                    <button
                      onClick={loadContacts}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Refresh
                    </button>
                  </div>

                  <input
                    className="mb-3 w-full rounded-xl border p-3 text-sm"
                    placeholder="Search by name, company, role..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />

                  {loading ? (
                    <p className="text-sm text-slate-500">
                      Loading contacts...
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredUsers.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => selectContact(contact)}
                          className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:border-blue-400 hover:bg-blue-50"
                        >
                          {contact.photo_url ? (
                            <img
                              src={contact.photo_url}
                              alt={contact.full_name}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">
                              {contact.full_name?.charAt(0) || "U"}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-bold text-slate-950">
                                {contact.full_name}
                              </p>

                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  contact.is_online
                                    ? "bg-green-500"
                                    : "bg-slate-300"
                                }`}
                                title={contact.status_label}
                              />
                            </div>

                            <p className="truncate text-xs text-slate-500">
                              {contact.title ||
                                contact.role?.replace("_", " ")}
                              {contact.company_name
                                ? ` • ${contact.company_name}`
                                : ""}
                            </p>

                            <p
                              className={`mt-1 text-xs font-bold ${
                                contact.is_online
                                  ? "text-green-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {contact.status_label}
                            </p>
                          </div>
                        </button>
                      ))}

                      {filteredUsers.length === 0 && (
                        <p className="text-sm text-slate-500">
                          No people found.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {(selectedContact || selectedAction) && (
              <form onSubmit={sendMessage} className="space-y-4">
                <button
                  type="button"
                  onClick={resetCompose}
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  ← Back to contacts
                </button>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Sending to
                  </p>

                  {selectedContact ? (
                    <>
                      <p className="mt-1 font-black text-slate-950">
                        {selectedContact.full_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {selectedContact.email}
                      </p>
                      <p
                        className={`mt-1 text-xs font-bold ${
                          selectedContact.is_online
                            ? "text-green-600"
                            : "text-slate-400"
                        }`}
                      >
                        {selectedContact.status_label}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 font-black text-slate-950">
                        {selectedAction?.label}
                      </p>
                      <p className="text-sm text-slate-500">
                        {selectedAction?.description}
                      </p>
                    </>
                  )}
                </div>

                <input
                  className="w-full rounded-xl border p-3"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />

                <textarea
                  className="min-h-[130px] w-full rounded-xl border p-3"
                  placeholder="Write your message..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                />

                <button
                  disabled={sending}
                  className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;