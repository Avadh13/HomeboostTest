import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../api/api";
import BrandLogo from "./BrandLogo";

type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  team_id?: number | null;
  partnership_id?: number | null;
  photo_url?: string | null;
};

type NavLinkItem = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: string;
};

type MessageThreadSummary = { unread_count?: number | string | null };

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

function Navbar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  let user: User | null = null;
  try {
    user = userData ? JSON.parse(userData) : null;
  } catch {
    user = null;
  }

  const isLoggedIn = Boolean(token && user);

  const links = useMemo(() => {
    if (!isLoggedIn) return publicLinks;
    if (user?.role === "employee") return employeeLinks;
    if (user?.role === "company_admin" || user?.role === "company") return companyLinks;
    if (user?.role === "hbt_admin") return hbtAdminLinks;
    if (user?.role === "hbt_member") return hbtMemberLinks;
    if (user?.role === "admin" || user?.role === "super_admin") return adminLinks;
    return publicLinks;
  }, [isLoggedIn, user?.role]);

  useEffect(() => {
    document.body.classList.toggle("hb-portal-mode", isLoggedIn);
    if (!isLoggedIn) setOpen(false);
  }, [isLoggedIn]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoggedIn || !token) {
      setUnreadAlerts(0);
      setUnreadMessages(0);
      return;
    }

    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };

    const loadBadges = async () => {
      try {
        const [notificationsResponse, messagesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/notifications/unread-count`, { headers }),
          fetch(`${API_BASE_URL}/messages/threads`, { headers }),
        ]);

        if (cancelled) return;

        if (notificationsResponse.ok) {
          const data = await notificationsResponse.json();
          setUnreadAlerts(Number(data.unread_count || 0));
        }

        if (messagesResponse.ok) {
          const threads = await messagesResponse.json();
          const unreadTotal = Array.isArray(threads)
            ? threads.reduce(
                (sum: number, thread: MessageThreadSummary) =>
                  sum + Number(thread.unread_count || 0),
                0,
              )
            : 0;
          setUnreadMessages(unreadTotal);
        }
      } catch {
        // Badge refresh is intentionally non-blocking.
      }
    };

    loadBadges();
    const timer = window.setInterval(loadBadges, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isLoggedIn, token, location.pathname]);

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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.body.classList.remove("hb-portal-mode");
    setOpen(false);
    navigate("/login");
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

  if (isLoggedIn && user) {
    return (
      <>
        <aside className={`hb-portal-sidebar ${open ? "is-open" : ""}`} data-hb-portal-navigation>
          <div className="hb-portal-brand">
            <Link to="/" aria-label="HomeBoost home">
              <BrandLogo className="h-12 w-[210px]" />
            </Link>
            <p>Employee Benefit Portal</p>
          </div>

          <nav className="hb-portal-nav" aria-label="Portal navigation">
            {links.map((link) => {
              const badgeCount = getBadgeCount(link);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`hb-portal-link ${isActive(link.to) ? "is-active" : ""}`}
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
                  <img src={user.photo_url} alt={user.full_name} />
                ) : (
                  initials(user.full_name)
                )}
              </span>
              <span className="hb-portal-profile-copy">
                <strong>{user.full_name}</strong>
                <small>{user.role.replaceAll("_", " ")}</small>
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
            <Link key={link.to} to={link.to} className={isActive(link.to) ? "is-active" : ""}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hb-public-actions">
          <Link to="/login" className="hb-public-signin">Sign In</Link>
          <Link to="/hbt-signup" className="hb-public-signup">Join Program</Link>
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
          <Link to="/login" onClick={() => setOpen(false)}>Sign In</Link>
          <Link to="/hbt-signup" onClick={() => setOpen(false)} className="is-primary">Join Program</Link>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
