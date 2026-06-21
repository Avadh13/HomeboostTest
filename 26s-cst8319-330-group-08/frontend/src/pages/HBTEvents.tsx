import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import ChatWidget from "../components/ChatWidget";

type EventItem = {
  id: number;
  title: string;
  description?: string | null;
  event_date?: string | null;
  booking_link?: string | null;
};

function HBTEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [bookingLink, setBookingLink] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const loadEvents = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/events/hbt`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, [token]);

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch(`${API_BASE_URL}/events/hbt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, description, event_date: eventDate, booking_link: bookingLink }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.message || "Failed to create event");
      return;
    }
    setTitle("");
    setDescription("");
    setEventDate("");
    setBookingLink("");
    loadEvents();
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    await fetch(`${API_BASE_URL}/events/hbt/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadEvents();
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to="/hbt/dashboard" className="text-blue-600 hover:underline">← Back to HBT Dashboard</Link>

        <section className="bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900">HBT Events</h1>
          <p className="text-gray-700 mt-3">Create webinars, Lunch & Learns, and booking events for employees.</p>
        </section>

        <form onSubmit={createEvent} className="bg-white rounded-xl shadow p-6 grid md:grid-cols-2 gap-4">
          <input className="border p-3 rounded" placeholder="Event Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="border p-3 rounded" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          <input className="border p-3 rounded md:col-span-2" placeholder="Booking Link" value={bookingLink} onChange={(e) => setBookingLink(e.target.value)} />
          <textarea className="border p-3 rounded md:col-span-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button className="bg-black text-white py-3 rounded md:col-span-2">Create Event</button>
        </form>

        <section className="bg-white rounded-xl shadow p-6">
          {loading ? <p>Loading events...</p> : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="border rounded p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-lg">{event.title}</h2>
                    <p className="text-gray-600">{event.description}</p>
                    <p className="text-sm text-gray-500">{event.event_date ? new Date(event.event_date).toLocaleString() : "Date TBD"}</p>
                    {event.booking_link && <a className="text-blue-600 underline text-sm" href={event.booking_link} target="_blank" rel="noreferrer">Booking link</a>}
                  </div>
                  <button onClick={() => deleteEvent(event.id)} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
                </div>
              ))}
              {events.length === 0 && <p className="text-gray-500">No events yet.</p>}
            </div>
          )}
        </section>
      </div>
      <ChatWidget />
    </main>
  );
}

export default HBTEvents;
