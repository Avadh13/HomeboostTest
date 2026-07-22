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
import { clearStoredSession, readStoredToken, readStoredUser, type StoredUser } from "../utils/auth";
import { dashboardPathForRole, isPortalPath } from "../utils/routes";
import BrandLogo from "./BrandLogo";

type NavLinkItem = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: string;
};

type MessageThreadSummary = { unread_count?: number | string | null };

type NavbarProps = {
  globalInstance?: boolean;
};

type NavbarHostProps = {
  globalMounted: boolean;
  children: ReactNode;
};

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

const hbtMemberLinks: NavLinkItem[] = [
  { to: "/hbt/member-dashboard", label: "Dashboard", icon: "⌂" },
  { to: "/hbt/quiz-submissions", label: "Quiz Submissions", shortLabel: "Submissions", icon: "✓" },
  { to: "/hbt/courses", label: "Courses", icon: "▣" },
  { to: "/hbt/reports", label: "Reports", icon: "▥" },
  { to: "/hbt/messages", label: "Communication", shortLabel: "Messages", icon: "✉" },
  { to: "/notifications", label: "Notifications", shortLabel: "Alerts", icon: "◉" },
  { to: "/profile", label: "My Profile", icon: "○" },
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

function NavbarContent() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  const links = useMemo(
    () => (portalMode ? linksForUser(user) : publicLinks),
    [portalMode, user?.role],
  );

  useEffect(() => {
    document.body.classList.toggle("hb-portal-mode", portalMode);
    if (!portalMode) setOpen(false);

    return () => {
      document.body.classList.remove("hb-portal-mode");
    };
  }, [portalMode]);

  useEffect(() => {
    setOpen(false);
    setSearch("");
  }, [location.pathname]);

  useEffect(() => {
    if (!portalMode || !navRef.current) return;
    const activeLink = navRef.current.querySelector<HTMLElement>(".hb-portal-link.is-active");
    activeLink?.scrollIntoView({ block: "nearest" });
  }, [location.pathname, portalMode]);

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
        const unreadTotal = Array.isArray(threads)
          ? threads.reduce(
              (sum: number, thread: MessageThreadSummary) =>
                sum + Number(thread.unread_count || 0),
              0,
            )
          : 0;
        if (!cancelled) setUnreadMessages(unreadTotal);
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
    to === "/"
      ? location.pathname === "/"
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  const getBadgeCount = (link: NavLinkItem) =>
    link.to.includes("messages")
      ? unreadMessages
      : link.to.includes("notifications")
        ? unreadAlerts
        : 0;

  const pageTitle =
    links.find((link) => isActive(link.to))?.label ||
    (user?.role === "employee" ? "Employee Portal" : "HomeBoost Portal");

  const profilePath =
    user?.role === "admin" || user?.role === "super_admin"
      ? "/admin/profile"
      : "/profile";

  const handleLogout = () => {
    clearStoredSession();
    setOpen(false);
    navigate("/login", { replace: true });
  };

  const handleSearch = () => {
    const query = search.trim().toLowerCase();
    if (!query) return;

    const match = links.find((link) =>
      `${link.label} ${link.shortLabel || ""}`.toLowerCase().includes(query),
    );

    if (match) {
      navigate(match.to);
      setSearch("");
    }
  };

  if (portalMode && user) {
    return (
      <>
        <aside className={`hb-portal-sidebar ${open ? "is-open" : ""}`} data-hb-portal-navigation>
          <div className="hb-portal-brand">
            <Link to={dashboardPath} aria-label="HomeBoost portal dashboard">
              <BrandLogo className="h-12 w-[210px]" />
            </Link>
            <p>Employee Benefit Portal</p>
          </div>

          <nav ref={navRef} className="hb-portal-nav" aria-label="Portal navigation">
            {links.map((link) => {
              const badgeCount = getBadgeCount(link);
              const active = isActive(link.to);

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`hb-portal-link ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="hb-portal-link-icon" aria-hidden="true">{link.icon}</span>
                  <span className="hb-portal-link-label">{link.label}</span>
                  {badgeCount > 0 && <span className="hb-portal-badge">{formatBadge(badgeCount)}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="hb-portal-sidebar-footer">
            <Link to="/contact" className="hb-portal-help-link">
              <span aria-hidden="true">?</span>
              Support
            </Link>
            <button type="button" onClick={handleLogout} className="hb-portal-logout">
              <span aria-hidden="true">↪</span>
              Logout
            </button>
          </div>
        </aside>

        <header className="hb-portal-topbar">
          <div className="hb-portal-topbar-left">
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="hb-portal-menu-button"
              aria-label="Toggle portal navigation"
              aria-expanded={open}
            >
              {open ? "×" : "☰"}
            </button>
            <div>
              <p className="hb-portal-kicker">HomeBoost</p>
              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="hb-portal-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              placeholder="Search portal pages..."
              aria-label="Search portal pages"
            />
          </div>

          <div className="hb-portal-user-actions">
            <Link to="/notifications" className="hb-portal-alert-button" aria-label="Notifications">
              <span aria-hidden="true">◉</span>
              {unreadAlerts > 0 && <span>{formatBadge(unreadAlerts)}</span>}
            </Link>

            <Link to={profilePath} className="hb-portal-profile-link">
              <span className="hb-portal-avatar">
                {user.photo_url ? (
                  <img src={user.photo_url} alt={user.full_name || "User"} />
                ) : (
                  initials(user.full_name)
                )}
              </span>
              <span className="hb-portal-profile-copy">
                <strong>{user.full_name || "User"}</strong>
                <small>{String(user.role || "user").replaceAll("_", " ")}</small>
              </span>
              <span className="hb-portal-chevron" aria-hidden="true">⌄</span>
            </Link>
          </div>
        </header>

        {open && (
          <button
            type="button"
            className="hb-portal-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Close portal navigation"
          />
        )}
      </>
    );
  }

  return (
    <nav className="hb-public-navbar">
      <div className="hb-public-navbar-inner">
        <Link to="/" className="hb-public-brand" aria-label="HomeBoost home">
          <BrandLogo className="h-12 w-[220px] md:h-14 md:w-[260px]" />
        </Link>

        <div className="hb-public-links">
          {publicLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={isActive(link.to) ? "is-active" : ""}
              aria-current={isActive(link.to) ? "page" : undefined}
            >
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

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="hb-public-menu"
          aria-expanded={open}
          aria-label="Toggle navigation menu"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="hb-public-mobile-menu">
          {publicLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
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
