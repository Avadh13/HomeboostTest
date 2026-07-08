import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

type PaymentSummary = {
  total_registrations: number;
  paid_count: number;
  pending_count: number;
  failed_count: number;
  revenue_cents: number;
  pending_cents: number;
  revenue_display: string;
  pending_display: string;
};

type PaymentRow = {
  registration_id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  company_name: string;
  role_title?: string | null;
  registration_status: string;
  payment_status: string;
  checkout_session_id?: string | null;
  team_id?: number | null;
  user_id?: number | null;
  registration_created_at?: string | null;
  payment_id?: number | null;
  provider?: string | null;
  provider_session_id?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  payment_record_status?: string | null;
  payment_created_at?: string | null;
  payment_updated_at?: string | null;
  hbt_team_name?: string | null;
  portal_user_name?: string | null;
  portal_user_email?: string | null;
};

type Bucket = { status?: string; provider?: string; total: number; amount_cents: number };

const statusTone = (status?: string | null) => {
  const normalized = String(status || "unknown");
  if (normalized === "paid") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (normalized === "demo_pending" || normalized === "pending") return "bg-amber-100 text-amber-700 ring-amber-200";
  if (["failed", "cancelled", "refunded"].includes(normalized)) return "bg-red-100 text-red-700 ring-red-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
};

const formatMoney = (cents?: number | null, currency = "cad") => {
  const amount = Number(cents || 0) / 100;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: String(currency || "cad").toUpperCase() }).format(amount);
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";

function ManagePayments() {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [statusBuckets, setStatusBuckets] = useState<Bucket[]>([]);
  const [providerBuckets, setProviderBuckets] = useState<Bucket[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const jsonHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const loadPayments = async () => {
    setLoading(true);
    setNotice("");
    try {
      const params = new URLSearchParams({ status, provider, search, limit: "200" });
      const [summaryResponse, listResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/payments/admin/summary`, { headers }),
        fetch(`${API_BASE_URL}/payments/admin/list?${params.toString()}`, { headers }),
      ]);
      const [summaryData, listData] = await Promise.all([summaryResponse.json(), listResponse.json()]);
      if (summaryData.status !== "success") throw new Error(summaryData.message || "Could not load payment summary");
      if (listData.status !== "success") throw new Error(listData.message || "Could not load payment list");
      setSummary(summaryData.summary);
      setStatusBuckets(Array.isArray(summaryData.status_breakdown) ? summaryData.status_breakdown : []);
      setProviderBuckets(Array.isArray(summaryData.provider_breakdown) ? summaryData.provider_breakdown : []);
      setPayments(Array.isArray(listData.payments) ? listData.payments : []);
    } catch (error) {
      setSummary(null);
      setPayments([]);
      setNotice(error instanceof Error ? error.message : "Could not load payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayments(); }, []);

  const updatePaymentStatus = async (paymentId: number | null | undefined, nextStatus: string) => {
    if (!paymentId) return setNotice("This registration does not have a payment row yet.");
    const response = await fetch(`${API_BASE_URL}/payments/admin/${paymentId}/status`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await response.json();
    setNotice(data.status === "success" ? "Payment status updated." : data.message || "Could not update payment.");
    loadPayments();
  };

  return (
    <AdminLayout title="Payment Tracking">
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/20 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Stripe + demo payment tracking</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Admin payment dashboard</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">Track HBT signup payments, demo activations, paid portal access, checkout session IDs, and revenue from one admin screen.</p>
            </div>
            <button onClick={loadPayments} className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-100">Refresh</button>
          </div>
        </section>

        {notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700 ring-1 ring-blue-100">{notice}</div>}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="metric-card"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Revenue</p><h2 className="mt-2 text-3xl font-black text-emerald-700">{summary?.revenue_display || "$0.00"}</h2><p className="mt-1 text-xs font-bold text-slate-500">Paid enrollment value</p></div>
          <div className="metric-card"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Paid</p><h2 className="mt-2 text-3xl font-black text-emerald-700">{summary?.paid_count || 0}</h2><p className="mt-1 text-xs font-bold text-slate-500">Completed signups</p></div>
          <div className="metric-card"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Pending</p><h2 className="mt-2 text-3xl font-black text-amber-700">{summary?.pending_count || 0}</h2><p className="mt-1 text-xs font-bold text-slate-500">Waiting payment/activation</p></div>
          <div className="metric-card"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Failed</p><h2 className="mt-2 text-3xl font-black text-red-700">{summary?.failed_count || 0}</h2><p className="mt-1 text-xs font-bold text-slate-500">Failed/cancelled</p></div>
          <div className="metric-card"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Total</p><h2 className="mt-2 text-3xl font-black text-blue-700">{summary?.total_registrations || 0}</h2><p className="mt-1 text-xs font-bold text-slate-500">Registrations</p></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            <div className="premium-card">
              <p className="eyebrow text-blue-600">Filters</p>
              <div className="mt-4 grid gap-3">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, company, session" className="form-field" />
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="form-field">
                  <option value="all">All statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="demo_pending">Demo pending</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
                <select value={provider} onChange={(event) => setProvider(event.target.value)} className="form-field">
                  <option value="all">All providers</option>
                  <option value="stripe">Stripe</option>
                  <option value="demo">Demo</option>
                </select>
                <button onClick={loadPayments} className="btn-primary justify-center">Apply Filters</button>
              </div>
            </div>

            <div className="premium-card">
              <p className="eyebrow text-emerald-600">Status breakdown</p>
              <div className="mt-4 space-y-3">
                {statusBuckets.length === 0 ? <p className="text-sm font-bold text-slate-500">No payment status data.</p> : statusBuckets.map((bucket) => (
                  <div key={bucket.status} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <div className="flex justify-between text-sm font-black"><span>{String(bucket.status || "unknown").replace(/_/g, " ")}</span><span>{bucket.total}</span></div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{formatMoney(bucket.amount_cents)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="premium-card">
              <p className="eyebrow text-violet-600">Provider split</p>
              <div className="mt-4 space-y-3">
                {providerBuckets.length === 0 ? <p className="text-sm font-bold text-slate-500">No provider data.</p> : providerBuckets.map((bucket) => (
                  <div key={bucket.provider} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <div className="flex justify-between text-sm font-black"><span>{bucket.provider || "registration"}</span><span>{bucket.total}</span></div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{formatMoney(bucket.amount_cents)}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="premium-card overflow-hidden">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div><p className="eyebrow text-slate-500">Payment records</p><h2 className="text-2xl font-black">HBT signup payments</h2></div>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">{payments.length} rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Registration</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Portal</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Admin action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center font-bold text-slate-500">Loading payments...</td></tr> : payments.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center font-bold text-slate-500">No payment records found.</td></tr> : payments.map((payment) => (
                    <tr key={`${payment.registration_id}-${payment.payment_id || "registration"}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><p className="font-black text-slate-950">#{payment.registration_id} {payment.full_name}</p><p className="text-xs font-semibold text-slate-500">{payment.email}</p><p className="mt-1 max-w-[240px] truncate text-[11px] font-mono text-slate-400">{payment.provider_session_id || payment.checkout_session_id || "no session"}</p></td>
                      <td className="px-4 py-3"><p className="font-bold text-slate-700">{payment.company_name}</p><p className="text-xs font-semibold text-slate-500">{payment.hbt_team_name || "Team pending"}</p></td>
                      <td className="px-4 py-3 font-black text-slate-950">{formatMoney(payment.amount_cents, payment.currency || "cad")}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">{payment.provider || "stripe"}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${statusTone(payment.payment_status || payment.payment_record_status)}`}>{String(payment.payment_status || payment.payment_record_status || "unknown").replace(/_/g, " ")}</span></td>
                      <td className="px-4 py-3"><p className="font-bold text-slate-700">{payment.portal_user_name ? "Created" : "Pending"}</p><p className="text-xs font-semibold text-slate-500">{payment.portal_user_email || "No portal user"}</p></td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-500">{formatDate(payment.registration_created_at)}</td>
                      <td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button onClick={() => updatePaymentStatus(payment.payment_id, "paid")} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Mark paid</button><button onClick={() => updatePaymentStatus(payment.payment_id, "refunded")} className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">Refunded</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </AdminLayout>
  );
}

export default ManagePayments;
