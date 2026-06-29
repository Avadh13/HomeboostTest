import type { ReactNode } from "react";

type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({ title = "Loading...", description = "Please wait while the latest information is prepared." }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      <p className="font-black text-slate-800">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

type EmptyStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title = "Nothing found", description = "Try changing filters or refreshing the page.", action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-100 text-2xl font-black text-violet-700">∅</div>
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  tone?: "violet" | "blue" | "green" | "amber" | "red" | "slate";
};

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  violet: "bg-violet-50 text-violet-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-700",
};

export function StatCard({ label, value, tone = "violet" }: StatCardProps) {
  return (
    <div className="metric-card">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <h2 className={`mt-2 rounded-2xl px-3 py-2 text-3xl font-black ${toneClasses[tone]}`}>{value}</h2>
    </div>
  );
}

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHero({ eyebrow, title, description, actions }: PageHeroProps) {
  return (
    <header className="theme-panel">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">{eyebrow}</p>
      <h1 className="mt-3 text-balance text-3xl font-black tracking-tight md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">{description}</p>
      {actions && <div className="mobile-stack-actions mt-6">{actions}</div>}
    </header>
  );
}
