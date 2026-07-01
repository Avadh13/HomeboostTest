import { useLocation } from "react-router-dom";
import MortgageServicesSection from "./MortgageServicesSection";

const publicPaths = ["/", "/pricing", "/contact", "/partners"];

function MortgageServicesShell() {
  const location = useLocation();

  if (location.pathname === "/employee-portal") {
    return (
      <MortgageServicesSection
        compact
        showHeroCopy={false}
        ctaHref="/employee/messages"
        secondaryHref="/employee/appointments"
        className="bg-slate-50"
      />
    );
  }

  if (!publicPaths.includes(location.pathname)) return null;

  return <MortgageServicesSection ctaHref="/login" secondaryHref="/contact" />;
}

export default MortgageServicesShell;
