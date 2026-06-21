import { useEffect, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import ChatWidget from "../../components/ChatWidget";
type ContactMessage = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  message: string;
  is_read: number;
  created_at: string;
};

function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  const loadMessages = async () => {
    const response = await fetch(`${API_BASE_URL}/contact`);
    const data = await response.json();
    setMessages(data);
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const markAsRead = async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/contact/${id}/read`, {
      method: "PUT",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    loadMessages();
  };

  const deleteMessage = async (id: number) => {
    const confirmDelete = confirm("Delete this message?");

    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE_URL}/contact/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    loadMessages();
  };

  return (
    <AdminLayout title="Contact Messages">
      <div className="bg-white p-6 rounded-lg shadow">
        {messages.length === 0 && (
          <p className="text-gray-500">No messages found.</p>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`border p-4 rounded-lg ${
                msg.is_read ? "bg-white" : "bg-yellow-50"
              }`}
            >
              <div className="flex justify-between mb-2">
                <div>
                  <h2 className="font-bold text-lg">{msg.full_name}</h2>

                  <p className="text-sm text-gray-500">
                    {msg.is_read ? "Read" : "Unread"}
                  </p>
                </div>

                <span className="text-sm text-gray-500">
                  {new Date(msg.created_at).toLocaleString()}
                </span>
              </div>

              <p className="text-gray-600 mb-1">Email: {msg.email}</p>
              <p className="text-gray-600 mb-3">Phone: {msg.phone || "N/A"}</p>

              <p className="bg-gray-50 p-3 rounded">{msg.message}</p>

              <div className="flex gap-3 mt-3">
                {!msg.is_read && (
                  <button
                    onClick={() => markAsRead(msg.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Mark Read
                  </button>
                )}

                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ChatWidget />
    </AdminLayout>
  );
}

export default ContactMessages;