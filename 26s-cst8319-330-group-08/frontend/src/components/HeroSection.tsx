import { Link } from "react-router-dom";

type HeroSectionProps = {
  title: string;
  subtitle?: string;
  primaryLink?: string;
  primaryLabel?: string;
  secondaryLink?: string;
  secondaryLabel?: string;
};

function HeroSection({ title, subtitle, primaryLink = "/login", primaryLabel = "Open Portal", secondaryLink = "/partners", secondaryLabel = "View Partners" }: HeroSectionProps) {
  return (
    <section className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">Employee Benefit Program</p>
        <h1 className="mt-4 text-5xl font-black text-slate-950 md:text-7xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-600">{subtitle}</p>}
        <div className="mt-8 flex justify-center gap-4">
          <Link to={primaryLink} className="rounded-full bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700">{primaryLabel}</Link>
          <Link to={secondaryLink} className="rounded-full border px-6 py-3 font-bold hover:bg-white">{secondaryLabel}</Link>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;