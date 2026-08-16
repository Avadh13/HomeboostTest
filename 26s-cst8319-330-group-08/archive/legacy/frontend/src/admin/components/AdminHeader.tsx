type AdminHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function AdminHeader({ title, subtitle, actionLabel, onAction }: AdminHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">Admin Control</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>}
      </div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="rounded-full bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default AdminHeader;
