import { Link, useLocation } from "react-router-dom";

const hiddenPrefixes = ["/admin", "/hbt/messages", "/employee/messages", "/company/messages", "/login", "/signup", "/hbt-signup", "/payment-success", "/mortgage-request"];
const publicPaths = ["/", "/contact"];
const reserved = ["admin", "hbt", "employee", "company", "resources", "quiz", "profile", "notifications", "login", "signup", "hbt-signup", "payment-success", "partners", "pricing", "contact", "mortgage-request"];

const getPartnershipSlug = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return "";
  return reserved.includes(parts[0]) ? "" : parts[0];
};

function MobileStickyCTA() {
  const location = useLocation();
  const pathname = location.pathname;
  const partnershipSlug = getPartnershipSlug(pathname);

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) return null;
  if (!publicPaths.includes(pathname) && !partnershipSlug) return null;

  const isPartnershipPortal = Boolean(partnershipSlug);
  const primaryHref = isPartnershipPortal ? `/mortgage-request?partnership=${encodeURIComponent(partnershipSlug)}` : "/hbt-signup";
  const secondaryHref = isPartnershipPortal ? "/employee/messages" : "/contact";

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/70 bg-white/95 p-3 shadow-2xl shadow-slate-950/15 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
        <Link to={secondaryHref} className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-800 active:scale-[0.98]">
          {isPartnershipPortal ? "Message Team" : "Contact Us"}
        </Link>
        <Link to={primaryHref} className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-blue-500/20 active:scale-[0.98]">
          {isPartnershipPortal ? "Start Request" : "Sign Up"}
        </Link>
      </div>
    </div>
  );
}

export default MobileStickyCTA;