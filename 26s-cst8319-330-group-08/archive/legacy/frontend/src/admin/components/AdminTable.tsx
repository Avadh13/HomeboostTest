import type { ReactNode } from "react";

type AdminTableProps = {
  headers: string[];
  children: ReactNode;
};

function AdminTable({ headers, children }: AdminTableProps) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-slate-500">
            {headers.map((header) => (
              <th key={header} className="px-5 py-4 font-black uppercase tracking-wide">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export default AdminTable;
