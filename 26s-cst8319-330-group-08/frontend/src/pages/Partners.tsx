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

  useEffect(() => {
    fetch(`${API_BASE_URL}/public-partnerships`)
      .then((res) => res.json())
      .then((data) => {
        setPartners(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Failed to load partners:", error);
        alert("Failed to load partner companies");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">
              Employer Portals
            </p>

            <h1 className="mt-3 text-5xl font-black text-slate-950">
              Partner Company Portals
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Select your employer to access the correct branded home-buying
              benefit portal.
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              Loading partner companies...
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              No active partner companies found.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner) => (
                <Link
                  key={partner.id}
                  to={`/${partner.slug}`}
                  className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-black text-white">
                      {partner.employer_name?.charAt(0) || "E"}
                    </div>

                    <div>
                      <h2 className="text-2xl font-black text-slate-950">
                        {partner.employer_name}
                      </h2>
                      <p className="text-sm font-semibold text-slate-500">
                        /{partner.slug}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2 text-sm text-slate-600">
                    {partner.hbt_name && (
                      <p>
                        <strong>Home Buying Team:</strong> {partner.hbt_name}
                      </p>
                    )}

                    {partner.phone && (
                      <p>
                        <strong>Phone:</strong> {partner.phone}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 inline-flex rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition group-hover:bg-blue-700">
                    Open Portal
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