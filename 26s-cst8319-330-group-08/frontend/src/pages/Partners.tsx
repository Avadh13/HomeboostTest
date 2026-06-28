import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";

type Partnership = {
  id: number;
  slug: string;
  status: string;
  employer_name: string;
  logo_url?: string | null;
  website?: string | null;
  phone?: string | null;
  hbt_name?: string | null;
};

function Partners() {
  const [partners, setPartners] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/public-partnerships`)
      .then(async (res) => {
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];

        if (!res.ok) {
          throw new Error(data.message || `Request failed with status ${res.status}`);
        }

        return data;
      })
      .then((data) => setPartners(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error("Failed to load partners:", error);
        setError("Could not load employer portals. Please check backend/database setup.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="theme-page">
      <Navbar />

      <section className="relative px-6 py-16">
        <div className="floating-orb -left-24 top-20 h-80 w-80 bg-blue-400" />
        <div className="floating-orb right-0 top-40 h-96 w-96 bg-violet-400" />

        <div className="section-container">
          <div className="theme-panel mb-10 text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">Employer Portals</p>
            <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Find your company portal</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-violet-100">
              Select your employer to access the correct branded home-buying benefit portal and start your guided journey.
            </p>
          </div>

          {loading ? (
            <div className="premium-card p-8 text-center font-bold text-slate-500">Loading partner companies...</div>
          ) : error ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center font-semibold text-amber-800 shadow-sm">{error}</div>
          ) : partners.length === 0 ? (
            <div className="premium-card p-8 text-center font-bold text-slate-500">No active partner companies found.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner) => (
                <Link key={partner.id} to={`/${partner.slug}`} className="group premium-card p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-2xl font-black text-white shadow-lg shadow-violet-500/20">
                      {partner.logo_url ? <img src={partner.logo_url} alt={partner.employer_name} className="h-full w-full rounded-2xl object-cover" /> : partner.employer_name?.charAt(0) || "E"}
                    </div>

                    <div>
                      <h2 className="text-2xl font-black text-slate-950">{partner.employer_name}</h2>
                      <p className="text-sm font-bold text-violet-500">/{partner.slug}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2 text-sm text-slate-600">
                    {partner.hbt_name && <p><strong>Home Buying Team:</strong> {partner.hbt_name}</p>}
                    {partner.phone && <p><strong>Phone:</strong> {partner.phone}</p>}
                  </div>

                  <div className="mt-6 inline-flex rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-black text-white transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                    Open Portal →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Partners;
