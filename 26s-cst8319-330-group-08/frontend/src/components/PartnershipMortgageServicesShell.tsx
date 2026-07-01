import { useLocation } from "react-router-dom";
import MortgageServicesSection from "./MortgageServicesSection";

const reserved = new Set([
  "admin",
  "hbt",
  "employee",
  "company",
  "resources",
  "quiz",
  "profile",
  "notifications",
  "login",
  "signup",
  "partners",
  "pricing",
  "contact",
  "mortgage-request",
]);

function PartnershipMortgageServicesShell() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);

  if (parts.length !== 1 || reserved.has(parts[0])) return null;

  return (
    <MortgageServicesSection
      compact
      ctaHref={`/mortgage-request?partnership=${encodeURIComponent(parts[0])}`}
      secondaryHref="/contact"
      className="bg-white/70"
    />
  );
}

export default PartnershipMortgageServicesShell;
