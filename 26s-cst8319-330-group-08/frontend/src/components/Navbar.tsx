import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import API_BASE_URL from "../api/api";
import { BRAND } from "../config/brand";
import { clearStoredSession, readStoredToken, readStoredUser, type StoredUser } from "../utils/auth";
import { dashboardPathForRole, isPortalPath } from "../utils/routes";
import BrandLogo from "./BrandLogo";

type NavLinkItem = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: string;
};

type PortalMenuEntry = {
  label: string;
  to?: string;
  items?: NavLinkItem[];
};

type MessageThreadSummary = { unread_count?: number | string | null };
type NavbarProps = { globalInstance?: boolean };
type NavbarHostProps = { globalMounted: boolean; children: ReactNode };

const GlobalNavbarContext = createContext(false);

export function NavbarHost({ globalMounted, children }: NavbarHostProps) {
  return <GlobalNavbarContext.Provider value={globalMounted}>{children}</GlobalNavbarContext.Provider>;
}

const initials = (name?: string) =>
  (name || "User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

const formatBadge = (count: number) => (count > 99 ? "99+" : String(count));

const publicLinks: NavLinkItem[] = [
  { to: "/", label: "Program", icon: "⌂" },
  { to: "/hbt-signup", label: "Sign Up", icon: "+" },
  { to: "/contact", label: "Contact", icon: "✉" },
];

const employeeLinks: NavLinkItem[] = [
  { to: "/employee-portal", label: "Dashboard", icon: "⌂" },
  { to: "/employee/journey", label: "My Journey", icon: "◇" },
  { to: "/resources", label: "Resources", icon: "▤" },
  { to: "/quiz", label: "Quizzes", icon: "✓" },
  { to: "/employee/messages", label: "Communication", shortLabel: "Messages", icon: "✉" },
  { to: "/notifications", label: "Notifications", shortLabel: "Alerts", icon: "◉" },
  { to: "/profile", label: "My Profile", icon: "○" },
];

const employeeMenu: PortalMenuEntry[] = [
  { label: "Dashboard", to: "/employee-portal" },
  { label: "Journey", to: "/employee/journey" },
  { label: "Learning", items: employeeLinks.slice(2, 4) },
  { label: "Communication", items: employeeLinks.slice(4, 6) },
  { label: "Account", items: employeeLinks.slice(6) },
];

const companyLinks: NavLinkItem[] = [
  { to: "/company/dashboard", label: "Dashboard", icon: "⌂" },
  { to: "/company/employer-approval", label: "Employer Approval", shortLabel: "Approval", icon: "✓" },
  { to: "/company/invites", label: "Employee Invites", shortLabel: "Invites", icon: "+" },
  { to: "/company/branding", label: "Portal Branding", shortLabel: "Branding", icon: "◇" },
  { to: "/company/reports", label: "Reports", icon: "▥" },
  { to: "/company/messages", label: "Communication", shortLabel: "Messages", icon: "✉" },
  { to: "/notifications", label: "Notifications", shortLabel: "Alerts", icon: "◉" },
  { to: "/profile", label: "My Profile", icon: "○" },
];

const companyMenu: PortalMenuEntry[] = [
  { label: "Dashboard", to: "/company/dashboard" },
  { label: "Employees", items: companyLinks.slice(1, 3) },
  { label: "Portal", items: companyLinks.slice(3, 5) },
  { label: "Communication", items: companyLinks.slice(5, 7) },
  { label: "Account", items: companyLinks.slice(7) },
];

const hbtAdminLinks: NavLinkItem[] = [
  { to: "/hbt/dashboard", label: "Dashboard", icon: "⌂" },
  { to: "/hbt/companies", label: "Companies", icon: "▦" },
  { to: "/hbt/employees", label: "Employees", icon: "♙" },
  { to: "/hbt/team-members", label: "Team Members", icon: "◎" },
  { to: "/hbt/resources", label: "Resources", icon: "▤" },
  { to: "/hbt/quiz-submissions", label: "Quiz Submissions", shortLabel: "Submissions", icon: "✓" },
  { to: "/hbt/events", label: "Education Events", shortLabel: "Events", icon: "□" },
  { to: "/hbt/courses", label: "Courses", icon: "▣" },
  { to: "/hbt/journeys", label: "Journeys", icon: "◇" },
  { to: "/hbt/quiz-journey-rules", label: "Journey Rules", shortLabel: "Rules", icon: "⌁" },
  { to: "/hbt/employer-approvals", label: "Employer Approvals", shortLabel: "Approvals", icon: "◈" },
  { to: "/hbt/invites", label: "Invites", icon: "+" },
  { to: "/hbt/branding", label: "Branding", icon: "✦" },
  { to: "/hbt/reports", label: "Reports", icon: "▥" },
  { to: "/hbt/qa", label: "QA Readiness", shortLabel: "QA", icon: "✓" },
  { to: "/hbt/messages", label: "Communication", shortLabel: "Messages", icon: "✉" },
  { to: "/notifications", label: "Notifications", shortLabel: "Alerts", icon: "◉" },
  { to: "/profile", label: "My Profile", icon: "○" },
];

const hbtAdminMenu: PortalMenuEntry[] = [
  { label: "Dashboard", to: "/hbt/dashboard" },
  { label: "People", items: hbtAdminLinks.slice(1, 4) },
  { label: "Learning", items: hbtAdminLinks.slice(4, 8) },
  { label: "Programs", items: hbtAdminLinks.slice(8, 12) },
  { label: "Insights", items: hbtAdminLinks.slice(13, 15) },
  { label: "More", items: [hbtAdminLinks[12], ...hbtAdminLinks.slice(15)] },
];

const hbtMemberLinks: NavLinkItem[] = [
  { to: "/hbt/member-dashboard", label: "Dashboard", icon: "⌂" },
  { to: "/hbt/quiz-submissions", label: "Quiz Submissions", shortLabel: "Submissions", icon: "✓" },
  { to: "/hbt/courses", label: "Courses", icon: "▣" },
  { to: "/hbt/reports", label: "Reports", icon: "▥" },
  { to: "/hbt/messages", label: "Communication", shortLabel: "Messages", icon: "✉" },
  { to: "/notifications", label: "Notifications", shortLabel: "Alerts", icon: "◉" },
  { to: "/profile", label: "My Profile", icon: "○" },
];

const hbtMemberMenu: PortalMenuEntry[] = [
  { label: "Dashboard", to: "/hbt/member-dashboard" },
  { label: "Learning", items: hbtMemberLinks.slice(1, 3) },
  { label: "Insights", items: hbtMemberLinks.slice(3, 4) },
  { label: "Communication", items: hbtMemberLinks.slice(4, 6) },
  { label: "Account", items: hbtMemberLinks.slice(6) },
];

const adminLinks: NavLinkItem[] = [
  { to: "/admin", label: "Admin Dashboard", shortLabel: "Admin", icon: "⌂" },
  { to: "/admin/reports", label: "Reports", icon: "▥" },
  { to: "/admin/qa", label: "QA Readiness", shortLabel: "QA", icon: "✓" },
  { to: "/admin/messages", label: "Communication", shortLabel: "Messages", icon: "✉" },
  { to: "/admin/notifications", label: "Notifications", shortLabel: "Alerts", icon: "◉" },
  { to: "/admin/profile", label: "My Profile", icon: "○" },
];

const linksForUser = (user: StoredUser | null): NavLinkItem[] => {
  if (user?.role === "employee") return employeeLinks;
  if (user?.role === "company_admin" || user?.role === "company") return companyLinks;
  if (user?.role === "hbt_admin") return hbtAdminLinks;
  if (user?.role === "hbt_member") return hbtMemberLinks;
  if (user?.role === "admin" || user?.role === "super_admin") return adminLinks;
  return publicLinks;
};

const menuForUser = (user: StoredUser | null, links: NavLinkItem[]): PortalMenuEntry[] => {
  if (user?.role === "employee") return employeeMenu;
  if (user?.role === "company_admin" || user?.role === "company") return companyMenu;
  if (user?.role === "hbt_admin") return hbtAdminMenu;
  if (user?.role === "hbt_member") return hbtMemberMenu;

  // Admin routes use AdminLayout and do not mount this portal header.
  return links.map((link) => ({ label: link.label, to: link.to }));
};

function NavbarContent() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [portalMenuOpen, setPortalMenuOpen] = useState<string | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const navRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const token = readStoredToken();
  const user = readStoredUser();
  const isLoggedIn = Boolean(token && user);
  const portalMode = Boolean(isLoggedIn && isPortalPath(location.pathname));
  const dashboardPath = dashboardPathForRole(user?.role);

  const links = useMemo(() => (portalMode ? linksForUser(user) : publicLinks), [portalMode, user?.role]);
  const portalMenu = useMemo<PortalMenuEntry[]>(() => menuForUser(user, links), [links, user?.role]);

  useEffect(() => {
    document.body.classList.toggle("hb-portal-mode", portalMode);
    if (!portalMode) setOpen(false);
    return () => document.body.classList.remove("hb-portal-mode");
  }, [portalMode]);

  useEffect(() => {
    setOpen(false);
    setSearch("");
    setPortalMenuOpen(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!portalMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setPortalMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [portalMenuOpen]);

  useEffect(() => {
    if (!portalMode || !token) {
      setUnreadAlerts(0);
      setUnreadMessages(0);
      return;
    }

    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };

    const loadBadges = async () => {
      const [notificationsResult, messagesResult] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/notifications/unread-count`, { headers }),
        fetch(`${API_BASE_URL}/messages/threads`, { headers }),
      ]);

      if (cancelled) return;

      if (notificationsResult.status === "fulfilled" && notificationsResult.value.ok) {
        const data = await notificationsResult.value.json().catch(() => ({}));
        if (!cancelled) setUnreadAlerts(Number(data.unread_count || 0));
      }

      if (messagesResult.status === "fulfilled" && messagesResult.value.ok) {
        const threads = await messagesResult.value.json().catch(() => []);
        const total = Array.isArray(threads)
          ? threads.reduce((sum: number, thread: MessageThreadSummary) => sum + Number(thread.unread_count || 0), 0)
          : 0;
        if (!cancelled) setUnreadMessages(total);
      }
    };

    loadBadges().catch(() => undefined);
    const timer = window.setInterval(() => loadBadges().catch(() => undefined), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [portalMode, token, location.pathname]);

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname === to || location.pathname.startsWith(`${to}/`);

  const badgeFor = (link: NavLinkItem) =>
    link.to.includes("messages") ? unreadMessages : link.to.includes("notifications") ? unreadAlerts : 0;

  const pageTitle =
    links.find((link) => isActive(link.to))?.label ||
    (user?.role === "employee" ? "Employee Portal" : "Employee Benefit Portal");

  const profilePath = user?.role === "admin" || user?.role === "super_admin" ? "/admin/profile" : "/profile";

  const handleLogout = () => {
    clearStoredSession();
    setOpen(false);
    setPortalMenuOpen(null);
    navigate("/login", { replace: true });
  };

  const handleSearch = () => {
    const query = search.trim().toLowerCase();
    if (!query) return;
    const match = links.find((link) => `${link.label} ${link.shortLabel || ""}`.toLowerCase().includes(query));
    if (match) {
      navigate(match.to);
      setSearch("");
    }
  };

  if (portalMode && user) {
    return (
      <header className="hb-portal-topbar hb-portal-unified-header">
        <div className="hb-portal-topbar-left">
          <div>
            <p className="hb-portal-kicker">{BRAND.name}</p>
            <h1>{pageTitle}</h1>
          </div>
        </div>

        <nav ref={navRef} className="hb-portal-nav" aria-label="Portal navigation" data-hb-portal-navigation>
          {portalMenu.map((entry) => {
            if (entry.to) {
              const sourceLink = links.find((link) => link.to === entry.to);
              const badgeCount = sourceLink ? badgeFor(sourceLink) : 0;
              const active = isActive(entry.to);

              return (
                <Link
                  key={entry.to}
                  to={entry.to}
                  className={`hb-portal-link ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="hb-portal-link-label">{entry.label}</span>
                  {badgeCount > 0 && <span className="hb-portal-badge">{formatBadge(badgeCount)}</span>}
                </Link>
              );
            }

            const items = entry.items || [];
            const active = items.some((item) => isActive(item.to));
            const openGroup = portalMenuOpen === entry.label;
            const groupBadge = items.reduce((sum, item) => sum + badgeFor(item), 0);

            return (
              <div key={entry.label} className={`hb-portal-menu-group ${active ? "is-active" : ""} ${openGroup ? "is-open" : ""}`}>
                <button
                  type="button"
                  className="hb-portal-menu-trigger"
                  onClick={() => setPortalMenuOpen((current) => (current === entry.label ? null : entry.label))}
                  aria-haspopup="menu"
                  aria-expanded={openGroup}
                >
                  <span>{entry.label}</span>
                  {groupBadge > 0 && <span className="hb-portal-badge">{formatBadge(groupBadge)}</span>}
                  <span className="hb-portal-menu-caret" aria-hidden="true">⌄</span>
                </button>

                {openGroup && (
                  <div className="hb-portal-submenu" role="menu" aria-label={`${entry.label} menu`}>
                    {items.map((item) => {
                      const itemActive = isActive(item.to);
                      const badgeCount = badgeFor(item);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          role="menuitem"
                          onClick={() => setPortalMenuOpen(null)}
                          className={`hb-portal-submenu-link ${itemActive ? "is-active" : ""}`}
                        >
                          <span>{item.label}</span>
                          {badgeCount > 0 && <span className="hb-portal-badge">{formatBadge(badgeCount)}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="hb-portal-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            placeholder="Search..."
            aria-label="Search portal pages"
          />
        </div>

        <div className="hb-portal-user-actions">
          <Link to="/notifications" className="hb-portal-alert-button" aria-label="Notifications">
            <span aria-hidden="true">◉</span>
            {unreadAlerts > 0 && <span>{formatBadge(unreadAlerts)}</span>}
          </Link>

          <Link to={profilePath} className="hb-portal-profile-icon" aria-label="Open my profile" title={user.full_name || "My Profile"}>
            <span className="hb-portal-avatar">
              {user.photo_url ? <img src={user.photo_url} alt={user.full_name || "User"} /> : initials(user.full_name)}
            </span>
          </Link>

          <button type="button" onClick={handleLogout} className="hb-portal-logout-button">
            Logout
          </button>
        </div>
      </header>
    );
  }

  return (
    <nav className="hb-public-navbar">
      <div className="hb-public-navbar-inner">
        <Link to="/" className="hb-public-brand" aria-label={`${BRAND.name} home`}>
          <BrandLogo className="h-12 w-[250px] md:h-14 md:w-[320px]" />
        </Link>

        <div className="hb-public-links">
          {publicLinks.map((link) => (
            <Link key={link.to} to={link.to} className={isActive(link.to) ? "is-active" : ""} aria-current={isActive(link.to) ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hb-public-actions">
          {isLoggedIn && user ? (
            <>
              <Link to={dashboardPath} className="hb-public-signin">Open Portal</Link>
              <button type="button" onClick={handleLogout} className="hb-public-signup">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hb-public-signin">Sign In</Link>
              <Link to="/hbt-signup" className="hb-public-signup">Join Program</Link>
            </>
          )}
        </div>

        <button type="button" onClick={() => setOpen((current) => !current)} className="hb-public-menu" aria-expanded={open} aria-label="Toggle navigation menu">
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="hb-public-mobile-menu">
          {publicLinks.map((link) => <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>{link.label}</Link>)}
          {isLoggedIn && user ? (
            <>
              <Link to={dashboardPath} onClick={() => setOpen(false)}>Open Portal</Link>
              <button type="button" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>Sign In</Link>
              <Link to="/hbt-signup" onClick={() => setOpen(false)} className="is-primary">Join Program</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

function Navbar({ globalInstance = false }: NavbarProps) {
  const globalMounted = useContext(GlobalNavbarContext);
  if (globalMounted && !globalInstance) return null;
  return <NavbarContent />;
}

export default Navbar;
