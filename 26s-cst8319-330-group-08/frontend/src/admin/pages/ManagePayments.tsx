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
  company_name: string;
  registration_status: string;
  payment_status: string;
  checkout_session_id?: string | null;
  registration_created_at?: string | null;
  payment_id?: number | null;
  provider?: string | null;
  provider_session_id?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  payment_record_status?: string | null;
  hbt_team_name?: string | null;
  portal_user_email?: string | null;
};

type Bucket = { status?: string; provider?: string; total: number; amount_cents: number };

const statusTone = (status?: string | null) => {
  const normalized = String(status || "unknown");
  if (normalized === "paid") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (normalized === "pending") return "bg-amber-100 text-amber-700 ring-amber-200";
  if (["failed", "cancelled", "refunded"].includes(normalized)) return "bg-red-100 text-red-700 ring-red-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
};

const formatMoney = (cents?: number | null, currency = "cad") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: String(currency || "cad").toUpperCase() }).format(Number(cents || 0) / 100);
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";
const filenameFromDisposition = (value: string | null, fallback: string) => value?.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
const compactId = (value?: string | null) => !value ? "No Stripe session" : value.length > 28 ? `${value.slice(0, 16)}...${value.slice(-8)}` : value;

function ManagePayments() {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [statusBuckets, setStatusBuckets] = useState<Bucket[]>([]);
  const [providerBuckets, setProviderBuckets] = useState<Bucket[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const jsonHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const loadPayments = async () => {
    setLoading(true);
    setNotice("");
    try {
      const params = new URLSearchParams({ status, provider: "stripe", search, limit: "200" });
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
      setNotice(error instanceof Error ? error.message : "Could not load Stripe payments.");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadPayments(); }, []);

  const updatePaymentStatus = async (paymentId: number | null | undefined, nextStatus: string) => {
    if (!paymentId) return setNotice("This registration does not have a Stripe payment row yet.");
    const response = await fetch(`${API_BASE_URL}/payments/admin/${paymentId}/status`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await response.json();
    setNotice(data.status === "success" ? "Payment status updated." : data.message || "Could not update payment.");
    loadPayments();
  };

  const downloadInvoice = async (payment: PaymentRow) => {
    setDownloadingId(payment.registration_id);
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/payments/admin/registrations/${payment.registration_id}/receipt`, { headers });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Could not download receipt.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFromDisposition(response.headers.get("content-disposition"), `employee-benefit-program-receipt-${payment.registration_id}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setNotice("Receipt downloaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not download receipt.");
    } finally { setDownloadingId(null); }
  };

  return (
    <AdminLayout title="Payment Tracking">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Stripe payment tracking</p><h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">HBT enrollment payments</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">Track real Stripe enrollment payments, portal provisioning, revenue, and receipts.</p></div><button onClick={loadPayments} className="btn-secondary">Refresh</button></div>
        </section>

        {notice && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700 ring-1 ring-blue-100">{notice}</div>}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="metric-card"><p className="text-xs font-black uppercase text-slate-400">Revenue</p><h2 className="mt-2 text-3xl font-black text-emerald-700">{summary?.revenue_display || "$0.00"}</h2><p className="mt-1 text-xs font-bold text-slate-500">Confirmed Stripe payments</p></div>
          <div className="metric-card"><p className="text-xs font-black uppercase text-slate-400">Paid</p><h2 className="mt-2 text-3xl font-black text-emerald-700">{summary?.paid_count || 0}</h2></div>
          <div className="metric-card"><p className="text-xs font-black uppercase text-slate-400">Pending</p><h2 className="mt-2 text-3xl font-black text-amber-700">{summary?.pending_count || 0}</h2></div>
          <div className="metric-card"><p className="text-xs font-black uppercase text-slate-400">Failed</p><h2 className="mt-2 text-3xl font-black text-red-700">{summary?.failed_count || 0}</h2></div>
          <div className="metric-card"><p className="text-xs font-black uppercase text-slate-400">Total</p><h2 className="mt-2 text-3xl font-black text-blue-700">{summary?.total_registrations || 0}</h2></div>
        </section>

        <section className="grid gap-6 2xl:grid-cols-[320px_1fr]">
          <aside className="space-y-6">
            <div className="premium-card"><p className="eyebrow">Filters</p><div className="mt-4 grid gap-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, company, Stripe session" className="form-field" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="form-field"><option value="all">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select><button onClick={loadPayments} className="btn-primary justify-center">Apply Filters</button></div></div>
            <div className="premium-card"><p className="eyebrow">Status breakdown</p><div className="mt-4 space-y-3">{statusBuckets.length === 0 ? <p className="text-sm font-bold text-slate-500">No payment status data.</p> : statusBuckets.map((bucket) => <div key={bucket.status} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"><div className="flex justify-between text-sm font-black"><span>{String(bucket.status || "unknown").replace(/_/g, " ")}</span><span>{bucket.total}</span></div><p className="mt-1 text-xs font-bold text-slate-500">{formatMoney(bucket.amount_cents)}</p></div>)}</div></div>
            <div className="premium-card"><p className="eyebrow">Payment provider</p><div className="mt-4 space-y-3">{providerBuckets.map((bucket) => <div key={bucket.provider} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"><div className="flex justify-between text-sm font-black"><span>{bucket.provider || "stripe"}</span><span>{bucket.total}</span></div><p className="mt-1 text-xs font-bold text-slate-500">{formatMoney(bucket.amount_cents)}</p></div>)}</div></div>
          </aside>

          <section className="rounded-[2rem] bg-white p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3"><div><p className="eyebrow">Payment records</p><h2 className="text-2xl font-black text-slate-950">Stripe enrollments</h2></div><span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">{payments.length} rows</span></div>
            {loading ? <div className="rounded-3xl bg-slate-50 p-8 text-center font-bold text-slate-500">Loading payments...</div> : payments.length === 0 ? <div className="rounded-3xl bg-slate-50 p-8 text-center font-bold text-slate-500">No Stripe payment records found.</div> : <div className="space-y-4">{payments.map((payment) => {
              const rowStatus = payment.payment_status || payment.payment_record_status || "unknown";
              const session = payment.provider_session_id || payment.checkout_session_id || "";
              return <article key={`${payment.registration_id}-${payment.payment_id || "registration"}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"><div className="grid gap-4 xl:grid-cols-[1.35fr_1fr_0.7fr_0.85fr_0.95fr] xl:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-slate-950">#{payment.registration_id} {payment.full_name || "Unnamed registration"}</h3><span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ring-1 ${statusTone(rowStatus)}`}>{String(rowStatus).replace(/_/g, " ")}</span></div><p className="mt-1 break-all text-sm font-bold text-slate-600">{payment.email}</p><p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 font-mono text-[11px] font-bold text-slate-500" title={session || "No session"}>{compactId(session)}</p></div><div><p className="text-[11px] font-black uppercase text-slate-400">Company</p><p className="mt-1 font-black text-slate-800">{payment.company_name || "—"}</p><p className="text-xs font-bold text-slate-500">{payment.hbt_team_name || "Team pending"}</p><p className="mt-2 break-all text-xs font-semibold text-slate-500">{payment.portal_user_email || "Portal account pending"}</p></div><div><p className="text-[11px] font-black uppercase text-slate-400">Amount</p><p className="mt-1 text-2xl font-black text-slate-950">{formatMoney(payment.amount_cents, payment.currency || "cad")}</p><span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">Stripe</span></div><div><p className="text-[11px] font-black uppercase text-slate-400">Created</p><p className="mt-1 text-sm font-black text-slate-700">{formatDate(payment.registration_created_at)}</p></div><div className="flex flex-wrap gap-2 xl:justify-end"><button onClick={() => downloadInvoice(payment)} disabled={downloadingId === payment.registration_id} className="rounded-full bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-60">{downloadingId === payment.registration_id ? "Downloading..." : "Receipt"}</button><button onClick={() => updatePaymentStatus(payment.payment_id, "paid")} className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">Mark paid</button><button onClick={() => updatePaymentStatus(payment.payment_id, "refunded")} className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-700">Refunded</button></div></div></article>;
            })}</div>}
          </section>
        </section>
      </div>
    </AdminLayout>
  );
}

export default ManagePayments;
