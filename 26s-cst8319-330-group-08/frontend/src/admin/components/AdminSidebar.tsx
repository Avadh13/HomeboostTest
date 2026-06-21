import { NavLink } from "react-router-dom";

export type AdminSidebarLink = {
  path: string;
  label: string;
  badge?: number;
};

type AdminSidebarProps = {
  links: AdminSidebarLink[];
  onNavigate?: () => void;
};

function AdminSidebar({ links, onNavigate }: AdminSidebarProps) {
  return (
    <nav className="space-y-2">
      {links.map((link) => (
        <NavLink
          key={link.path}
          to={link.path}
          end={link.path === "/admin"}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center justify-between rounded-2xl px-4 py-3 font-semibold transition ${
              isActive ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
            }`
          }
        >
          <span>{link.label}</span>
          {!!link.badge && <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">{link.badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export default AdminSidebar;
