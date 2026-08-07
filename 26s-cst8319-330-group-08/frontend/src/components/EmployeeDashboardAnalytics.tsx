import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  Gauge,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

export type EmployeeDashboardAnalyticsData = {
  overall_progress_percent: number;
  journey: {
    total_steps: number;
    completed_steps: number;
    percent: number;
  };
  counts: {
    resources_available: number;
    resources_viewed: number;
    saved_resources: number;
    quizzes_available: number;
    quizzes_completed: number;
    quiz_submissions: number;
    unread_messages: number;
  };
  latest_assessment: {
    title: string;
    score: number | null;
    level: string;
    summary: string | null;
    completed_at: string | null;
  } | null;
  monthly_activity: Array<{
    key: string;
    label: string;
    completed_steps: number;
    quiz_submissions: number;
    resource_views: number;
    total: number;
  }>;
  focus_areas: Array<{
    key: string;
    label: string;
    value: number;
    path: string;
  }>;
};

type Props = {
  analytics: EmployeeDashboardAnalyticsData;
  primary: string;
};

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  helper: string;
  path: string;
  primary: string;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Number(value) || 0));

const formatDate = (value: string | null) => {
  if (!value) return "No assessment yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently completed";
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

function ProgressDonut({ value, primary }: { value: number; primary: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = clampPercent(value);
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative mx-auto h-40 w-40 shrink-0" role="img" aria-label={`Overall progress ${progress}%`}>
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="employee-progress-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="13" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="url(#employee-progress-gradient)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-black tracking-tight text-slate-950">{progress}%</span>
        <span className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Overall</span>
      </div>
    </div>
  );
}

function ActivityLineChart({
  activity,
  primary,
}: {
  activity: EmployeeDashboardAnalyticsData["monthly_activity"];
  primary: string;
}) {
  const width = 520;
  const height = 220;
  const left = 26;
  const right = 18;
  const top = 20;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(1, ...activity.map((item) => Number(item.total || 0)));
  const pointGap = activity.length > 1 ? chartWidth / (activity.length - 1) : chartWidth;
  const points = activity.map((item, index) => ({
    ...item,
    x: left + index * pointGap,
    y: top + chartHeight - (Number(item.total || 0) / maxValue) * chartHeight,
  }));
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = points.length
    ? `M ${points[0].x} ${top + chartHeight} L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${points[points.length - 1].x} ${top + chartHeight} Z`
    : "";
  const hasActivity = activity.some((item) => item.total > 0);

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Last six months</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Learning activity</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5" /> Live data
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-slate-50 px-2 pt-2 ring-1 ring-slate-100">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[210px] w-full"
          role="img"
          aria-label="Monthly learning activity line chart"
        >
          <defs>
            <linearGradient id="employee-activity-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary} stopOpacity="0.28" />
              <stop offset="100%" stopColor={primary} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.33, 0.66, 1].map((ratio) => {
            const y = top + chartHeight * ratio;
            return <line key={ratio} x1={left} x2={width - right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="5 7" />;
          })}

          {areaPath && <path d={areaPath} fill="url(#employee-activity-area)" />}
          {linePoints && (
            <polyline
              points={linePoints}
              fill="none"
              stroke={primary}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((point) => (
            <g key={point.key}>
              <circle cx={point.x} cy={point.y} r="6" fill="white" stroke={primary} strokeWidth="4">
                <title>{`${point.label}: ${point.total} activities (${point.completed_steps} journey, ${point.quiz_submissions} quizzes, ${point.resource_views} resources)`}</title>
              </circle>
              <text x={point.x} y={height - 14} textAnchor="middle" className="fill-slate-400 text-[12px] font-bold">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {!hasActivity && (
        <p className="mt-2 text-xs font-semibold text-slate-400">
          Your graph will grow as you complete journey steps, quizzes, and resources.
        </p>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper, path, primary }: MetricCardProps) {
  return (
    <Link
      to={path}
      className="group rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-lg shadow-slate-200/55 transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md" style={{ backgroundColor: primary }}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" />
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <h3 className="mt-1 text-sm font-black text-slate-800">{label}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{helper}</p>
    </Link>
  );
}

function FocusProgress({
  focusAreas,
  primary,
}: {
  focusAreas: EmployeeDashboardAnalyticsData["focus_areas"];
  primary: string;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/60 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: primary }}>Recommended for you</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Your next best steps</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">Keep momentum by finishing the lowest-progress area first.</p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <BarChart3 className="h-6 w-6" />
        </span>
      </div>

      <div className="mt-7 space-y-5">
        {focusAreas.map((area) => {
          const value = clampPercent(area.value);
          return (
            <Link key={area.key} to={area.path} className="group block rounded-2xl p-2 transition hover:bg-slate-50">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-black text-slate-700 group-hover:text-slate-950">{area.label}</span>
                <span className="text-sm font-black" style={{ color: primary }}>{value}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${value}%`, background: `linear-gradient(90deg, ${primary}, #7c3aed)` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function EmployeeDashboardAnalytics({ analytics, primary }: Props) {
  const latest = analytics.latest_assessment;
  const assessmentValue = latest?.score === null || latest?.score === undefined ? (latest ? "Done" : "—") : `${latest.score}%`;

  return (
    <section aria-labelledby="employee-dashboard-insights" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Dashboard insights</p>
          <h2 id="employee-dashboard-insights" className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Your progress at a glance
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-slate-500">
          These charts use your real journey, quiz, resource, and message activity—not placeholder numbers.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/60 md:p-6">
          <div className="grid gap-6 lg:grid-cols-[180px_1fr] lg:items-center">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Your progress</p>
              <ProgressDonut value={analytics.overall_progress_percent} primary={primary} />
              <p className="text-xs font-bold text-slate-500">
                {analytics.journey.completed_steps} of {analytics.journey.total_steps || 0} journey steps complete
              </p>
            </div>
            <ActivityLineChart activity={analytics.monthly_activity} primary={primary} />
          </div>
        </div>

        <FocusProgress focusAreas={analytics.focus_areas} primary={primary} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Gauge}
          label="Readiness score"
          value={assessmentValue}
          helper={latest ? `${latest.level} • ${formatDate(latest.completed_at)}` : "Complete your onboarding quiz"}
          path="/quiz"
          primary={primary}
        />
        <MetricCard
          icon={ClipboardCheck}
          label="Completed quizzes"
          value={analytics.counts.quizzes_completed}
          helper={`${analytics.counts.quizzes_available} currently available`}
          path="/quiz"
          primary={primary}
        />
        <MetricCard
          icon={BookOpenCheck}
          label="Resources explored"
          value={analytics.counts.resources_viewed}
          helper={`${analytics.counts.saved_resources} saved for later`}
          path="/resources"
          primary={primary}
        />
        <MetricCard
          icon={MessageCircle}
          label="Unread messages"
          value={analytics.counts.unread_messages}
          helper={analytics.counts.unread_messages > 0 ? "Your advisor may be waiting" : "You are all caught up"}
          path="/employee/messages"
          primary={primary}
        />
      </div>
    </section>
  );
}

export default EmployeeDashboardAnalytics;
