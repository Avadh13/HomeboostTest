import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../api/api";

type FooterSettings = {
  is_enabled: number;
  brand_name: string;
  logo_text?: string | null;
  tagline?: string | null;
  description?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
  newsletter_title?: string | null;
  newsletter_text?: string | null;
  background_mode?: "dark" | "light" | "soft";
  layout_style?: "three_column" | "compact" | "newsletter";
  copyright_text?: string | null;
};

type FooterLink = {
  id: number;
  label: string;
  href: string;
  column_key: "left" | "center" | "right" | "bottom";
  display_order: number;
  is_active: number;
  opens_new_tab: number;
};

type FooterData = {
  settings: FooterSettings;
  links: FooterLink[];
};

const fallback: FooterData = {
  settings: {
    is_enabled: 1,
    brand_name: "HomeBoost Employee Benefit",
    logo_text: "HB",
    tagline: "Employer home-buying benefit platform.",
    description: "Modern employer portals, advisor communication, resources, quizzes, appointments, and guided home-buying support in one place.",
    cta_text: "Request Setup",
    cta_link: "/contact",
    newsletter_title: "Need a custom employer portal?",
    newsletter_text: "Footer content, links, and calls-to-action are controlled from the admin panel.",
    background_mode: "dark",
    layout_style: "three_column",
    copyright_text: "© 2026 HomeBoost. All rights reserved.",
  },
  links: [
    { id: 1, label: "Employer Portals", href: "/partners", column_key: "left", display_order: 1, is_active: 1, opens_new_tab: 0 },
    { id: 2, label: "Pricing", href: "/pricing", column_key: "left", display_order: 2, is_active: 1, opens_new_tab: 0 },
    { id: 3, label: "Contact", href: "/contact", column_key: "left", display_order: 3, is_active: 1, opens_new_tab: 0 },
    { id: 4, label: "Login", href: "/login", column_key: "center", display_order: 1, is_active: 1, opens_new_tab: 0 },
  ],
};

const themeClasses = {
  dark: "border-slate-800 bg-[#050b16] text-white",
  light: "border-slate-200 bg-white text-slate-950",
  soft: "border-blue-100 bg-gradient-to-br from-white via-blue-50 to-pink-50 text-slate-950",
};

const mutedClasses = {
  dark: "text-slate-400",
  light: "text-slate-500",
  soft: "text-slate-500",
};

const panelClasses = {
  dark: "border-white/10 bg-white/[0.06]",
  light: "border-slate-200 bg-slate-50",
  soft: "border-white/70 bg-white/75",
};

const columnLabels: Record<FooterLink["column_key"], string> = {
  left: "Explore",
  center: "Portal",
  right: "Support",
  bottom: "More",
};

const isExternal = (href: string) => /^https?:\/\//i.test(href);

function Footer() {
  const [data, setData] = useState<FooterData>(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/footer`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => {
        if (!mounted) return;
        if (payload?.settings) {
          setData({ settings: payload.settings, links: Array.isArray(payload.links) ? payload.links : [] });
        }
      })
      .catch(() => {
        if (mounted) setData(fallback);
      })
      .finally(() => {
        if (mounted) setLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const settings = data.settings || fallback.settings;
  const backgroundMode = settings.background_mode || "dark";
  const activeLinks = data.links.filter((link) => Number(link.is_active) === 1);
  const linksByColumn = useMemo(() => {
    return activeLinks.reduce<Record<FooterLink["column_key"], FooterLink[]>>(
      (groups, link) => {
        groups[link.column_key]?.push(link);
        return groups;
      },
      { left: [], center: [], right: [], bottom: [] }
    );
  }, [activeLinks]);

  if (loaded && Number(settings.is_enabled) !== 1) return null;

  const renderLink = (link: FooterLink) => (
    <a
      key={link.id}
      href={link.href || "#"}
      target={isExternal(link.href) || Number(link.opens_new_tab) === 1 ? "_blank" : undefined}
      rel={isExternal(link.href) || Number(link.opens_new_tab) === 1 ? "noreferrer" : undefined}
      className={`block rounded-xl px-3 py-2 text-sm font-bold transition hover:bg-blue-500/10 hover:text-blue-400 ${mutedClasses[backgroundMode]}`}
    >
      {link.label}
    </a>
  );

  return (
    <footer className={`border-t ${themeClasses[backgroundMode]}`}>
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-6 md:py-12">
        <div className={`overflow-hidden rounded-[2rem] border p-5 shadow-2xl md:p-7 ${panelClasses[backgroundMode]}`}>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1.4fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white shadow-lg shadow-blue-500/20">
                  {settings.logo_text || "HB"}
                </span>
                <div>
                  <h2 className="text-xl font-black tracking-tight">{settings.brand_name || "HomeBoost Employee Benefit"}</h2>
                  {settings.tagline && <p className={`mt-0.5 text-sm font-semibold ${mutedClasses[backgroundMode]}`}>{settings.tagline}</p>}
                </div>
              </div>

              {settings.description && <p className={`mt-5 max-w-xl text-sm leading-relaxed ${mutedClasses[backgroundMode]}`}>{settings.description}</p>}

              {(settings.cta_text || settings.newsletter_title) && (
                <div className={`mt-6 rounded-2xl border p-4 ${panelClasses[backgroundMode]}`}>
                  {settings.newsletter_title && <p className="font-black">{settings.newsletter_title}</p>}
                  {settings.newsletter_text && <p className={`mt-1 text-sm leading-relaxed ${mutedClasses[backgroundMode]}`}>{settings.newsletter_text}</p>}
                  {settings.cta_text && settings.cta_link && (
                    <a href={settings.cta_link} className="mt-4 inline-flex rounded-full bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700">
                      {settings.cta_text}
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className={`grid gap-5 ${settings.layout_style === "compact" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {(["left", "center", "right"] as FooterLink["column_key"][]).map((column) => (
                <div key={column}>
                  <h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-blue-400">{columnLabels[column]}</h3>
                  <div className="space-y-1">{linksByColumn[column].map(renderLink)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-8 flex flex-col gap-4 border-t pt-5 md:flex-row md:items-center md:justify-between ${backgroundMode === "dark" ? "border-white/10" : "border-slate-200"}`}>
            <p className={`text-sm font-semibold ${mutedClasses[backgroundMode]}`}>{settings.copyright_text || "© 2026 HomeBoost. All rights reserved."}</p>
            <div className="flex flex-wrap gap-2">{linksByColumn.bottom.map(renderLink)}</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
