import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/api";
import { BRAND, MORTGAGE_SERVICES } from "../config/brand";

type MortgageService = {
  id?: number;
  service_key?: string;
  key?: string;
  title: string;
  short_title?: string | null;
  description?: string | null;
  icon?: string | null;
  color_class?: string | null;
};

type MortgageServicesSectionProps = {
  compact?: boolean;
  showHeroCopy?: boolean;
  ctaHref?: string;
  secondaryHref?: string;
  className?: string;
};

const serviceKey = (service: MortgageService) => service.service_key || service.key || String(service.id || service.title);
const serviceIcon = (service: MortgageService) => service.icon || "🏡";

function MortgageServicesSection({
  compact = false,
  showHeroCopy = true,
  ctaHref = "/mortgage-request",
  secondaryHref = "/contact",
  className = "",
}: MortgageServicesSectionProps) {
  const [apiServices, setApiServices] = useState<MortgageService[]>([]);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/mortgage-services`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!mounted) return;
        setApiServices(Array.isArray(data.services) ? data.services : []);
      })
      .catch(() => {
        if (mounted) setApiServices([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const services = useMemo<MortgageService[]>(() => {
    const base = apiServices.length > 0 ? apiServices : MORTGAGE_SERVICES;
    return compact ? base.slice(0, 6) : base;
  }, [apiServices, compact]);

  const getRequestLink = (service: MortgageService) => `${ctaHref}${ctaHref.includes("?") ? "&" : "?"}service=${encodeURIComponent(serviceKey(service))}`;

  return (
    <section className={`px-4 py-12 md:px-6 lg:py-16 ${className}`}>
      <div className="section-container">
        <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-blue-950/10 backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[0.78fr_1.22fr]">
            {showHeroCopy && (
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-6 text-white md:p-8">
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="relative">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">Mortgage support</p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">How can we help?</h2>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">{BRAND.description}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to={ctaHref} className="rounded-full bg-sky-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-sky-400/20 hover:bg-sky-300">
                      {BRAND.primaryCta}
                    </Link>
                    <Link to={secondaryHref} className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">
                      {BRAND.secondaryCta}
                    </Link>
                  </div>
                  <div className="mt-7 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-2xl font-black">One guided intake</p>
                    <p className="mt-1 text-sm font-semibold text-slate-300">Pick a service, share details, then connect with the right advisor.</p>
                  </div>
                </div>
              </div>
            )}

            <div className={`grid gap-4 p-5 md:p-7 ${showHeroCopy ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {services.map((service) => (
                <Link
                  key={serviceKey(service)}
                  to={getRequestLink(service)}
                  className="group rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl md:p-5"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 text-2xl transition group-hover:scale-110">{serviceIcon(service)}</span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">Service</span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-slate-950 md:text-xl">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{service.description}</p>
                  <p className="mt-4 text-sm font-black text-blue-700">Start request →</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MortgageServicesSection;
