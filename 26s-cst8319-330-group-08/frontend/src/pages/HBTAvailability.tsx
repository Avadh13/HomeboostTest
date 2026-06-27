import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";

type TeamMember = {
  id: number;
  full_name: string;
  title?: string;
  email?: string;
};

type AvailabilityRow = {
  id?: number;
  team_member_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: number | boolean;
};

type TimeOff = {
  id: number;
  team_member_id: number;
  start_datetime: string;
  end_datetime: string;
  reason?: string | null;
};

const days = [
  [0, "Sunday"],
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
] as const;

const defaultRows = (teamMemberId: number): AvailabilityRow[] =>
  days.map(([day]) => ({
    team_member_id: teamMemberId,
    day_of_week: day,
    start_time: "09:00",
    end_time: "17:00",
    is_available: day >= 1 && day <= 5,
  }));

const toInputTime = (value?: string) => (value ? value.slice(0, 5) : "09:00");

function HBTAvailability() {
  const token = localStorage.getItem("token");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<number | null>(null);
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [offStart, setOffStart] = useState("");
  const [offEnd, setOffEnd] = useState("");
  const [offReason, setOffReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const loadData = async () => {
    setLoading(true);
    setNotice(null);

    try {
      const response = await fetch(`${API_BASE_URL}/advisor-availability`, { headers });
      const data = await response.json();

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Could not load availability." });
        return;
      }

      const members = Array.isArray(data.team_members) ? data.team_members : [];
      const availabilityRows = Array.isArray(data.availability) ? data.availability : [];
      const offRows = Array.isArray(data.time_off) ? data.time_off : [];

      setTeamMembers(members);
      setAvailability(availabilityRows);
      setTimeOff(offRows);

      if (!selectedTeamMemberId && members.length > 0) {
        setSelectedTeamMemberId(members[0].id);
      }
    } catch (error) {
      console.error("Availability load failed:", error);
      setNotice({ type: "error", message: "Could not load availability data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedTeamMemberId) {
      setRows([]);
      return;
    }

    const existing = availability.filter((item) => Number(item.team_member_id) === Number(selectedTeamMemberId));
    const merged = defaultRows(selectedTeamMemberId).map((fallback) => {
      const match = existing.find((item) => Number(item.day_of_week) === fallback.day_of_week);
      return match
        ? {
            ...match,
            start_time: toInputTime(match.start_time),
            end_time: toInputTime(match.end_time),
            is_available: Boolean(match.is_available),
          }
        : fallback;
    });

    setRows(merged);
  }, [availability, selectedTeamMemberId]);

  const selectedMember = useMemo(
    () => teamMembers.find((item) => Number(item.id) === Number(selectedTeamMemberId)),
    [teamMembers, selectedTeamMemberId]
  );

  const selectedTimeOff = useMemo(
    () => timeOff.filter((item) => Number(item.team_member_id) === Number(selectedTeamMemberId)),
    [timeOff, selectedTeamMemberId]
  );

  const updateRow = (day: number, field: keyof AvailabilityRow, value: string | boolean) => {
    setRows((prev) =>
      prev.map((row) =>
        row.day_of_week === day ? { ...row, [field]: value } : row
      )
    );
  };

  const saveAvailability = async () => {
    if (!selectedTeamMemberId) return;
    setNotice(null);

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/advisor-availability/${selectedTeamMemberId}`, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ availability: rows }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Could not save availability." });
        return;
      }

      setNotice({ type: "success", message: "Availability saved successfully." });
      await loadData();
    } catch (error) {
      console.error("Availability save failed:", error);
      setNotice({ type: "error", message: "Could not save availability." });
    } finally {
      setSaving(false);
    }
  };

  const addTimeOff = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedTeamMemberId || !offStart || !offEnd) {
      setNotice({ type: "error", message: "Select advisor, start time, and end time." });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/advisor-availability/time-off`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_member_id: selectedTeamMemberId,
          start_datetime: offStart,
          end_datetime: offEnd,
          reason: offReason,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Could not add time off." });
        return;
      }

      setNotice({ type: "success", message: "Time off added." });
      setOffStart("");
      setOffEnd("");
      setOffReason("");
      await loadData();
    } catch (error) {
      console.error("Add time off failed:", error);
      setNotice({ type: "error", message: "Could not add time off." });
    } finally {
      setSaving(false);
    }
  };

  const deleteTimeOff = async (id: number) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/advisor-availability/time-off/${id}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Could not remove time off." });
        return;
      }

      setNotice({ type: "success", message: "Time off removed." });
      await loadData();
    } catch (error) {
      console.error("Delete time off failed:", error);
      setNotice({ type: "error", message: "Could not remove time off." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-blue-950 p-8 text-white shadow-xl">
          <Link to="/hbt/dashboard" className="text-sm font-bold text-blue-200 hover:text-white">← Back to HBT dashboard</Link>
          <h1 className="mt-4 text-4xl font-black">Advisor Availability</h1>
          <p className="mt-3 max-w-3xl text-blue-100">Set advisor working hours and block off unavailable time. Employee booking will use these settings in the next slot-selection pass.</p>
        </header>

        {notice && (
          <div className={`rounded-2xl border px-5 py-4 font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {notice.message}
          </div>
        )}

        {loading ? (
          <section className="rounded-3xl bg-white p-8 shadow-xl">Loading availability...</section>
        ) : teamMembers.length === 0 ? (
          <section className="rounded-3xl bg-white p-8 text-center text-slate-600 shadow-xl">No active team members found.</section>
        ) : (
          <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <aside className="rounded-[2rem] bg-white p-6 shadow-xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Advisors</p>
              <h2 className="mt-2 text-2xl font-black">Select advisor</h2>

              <div className="mt-5 space-y-3">
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedTeamMemberId(member.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      Number(selectedTeamMemberId) === Number(member.id)
                        ? "border-blue-500 bg-blue-50 shadow"
                        : "border-slate-100 bg-slate-50 hover:border-blue-200"
                    }`}
                  >
                    <p className="font-black text-slate-950">{member.full_name}</p>
                    <p className="text-sm text-slate-500">{member.title || "Advisor"}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </button>
                ))}
              </div>
            </aside>

            <div className="space-y-8">
              <section className="rounded-[2rem] bg-white p-7 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Weekly hours</p>
                    <h2 className="text-3xl font-black">{selectedMember?.full_name || "Advisor"}</h2>
                  </div>
                  <button disabled={saving} onClick={saveAvailability} className="rounded-full bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60">
                    {saving ? "Saving..." : "Save Hours"}
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {rows.map((row) => {
                    const dayName = days.find(([day]) => day === row.day_of_week)?.[1] || "Day";
                    return (
                      <div key={row.day_of_week} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                        <label className="flex items-center gap-3 font-bold text-slate-800">
                          <input type="checkbox" checked={Boolean(row.is_available)} onChange={(e) => updateRow(row.day_of_week, "is_available", e.target.checked)} />
                          {dayName}
                        </label>
                        <label className="text-sm font-semibold text-slate-600">
                          Start
                          <input type="time" value={toInputTime(row.start_time)} onChange={(e) => updateRow(row.day_of_week, "start_time", e.target.value)} className="ml-2 rounded-xl border border-slate-200 bg-white p-2" disabled={!row.is_available} />
                        </label>
                        <label className="text-sm font-semibold text-slate-600">
                          End
                          <input type="time" value={toInputTime(row.end_time)} onChange={(e) => updateRow(row.day_of_week, "end_time", e.target.value)} className="ml-2 rounded-xl border border-slate-200 bg-white p-2" disabled={!row.is_available} />
                        </label>
                        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${row.is_available ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {row.is_available ? "Available" : "Off"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[2rem] bg-white p-7 shadow-xl">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Time off</p>
                <h2 className="mt-2 text-3xl font-black">Block unavailable time</h2>

                <form onSubmit={addTimeOff} className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Start</span>
                    <input type="datetime-local" value={offStart} onChange={(e) => setOffStart(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">End</span>
                    <input type="datetime-local" value={offEnd} onChange={(e) => setOffEnd(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Reason</span>
                    <input value={offReason} onChange={(e) => setOffReason(e.target.value)} placeholder="Vacation, unavailable..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3" />
                  </label>
                  <button disabled={saving} className="rounded-2xl bg-slate-950 px-6 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60">
                    Add
                  </button>
                </form>

                <div className="mt-6 space-y-3">
                  {selectedTimeOff.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">No time off entries for this advisor.</p>
                  ) : (
                    selectedTimeOff.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div>
                          <p className="font-black text-slate-950">{new Date(item.start_datetime).toLocaleString()} → {new Date(item.end_datetime).toLocaleString()}</p>
                          <p className="text-sm text-slate-500">{item.reason || "No reason provided"}</p>
                        </div>
                        <button onClick={() => deleteTimeOff(item.id)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default HBTAvailability;
