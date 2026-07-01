import { useLocation } from "react-router-dom";
import MortgageServicesSection from "./MortgageServicesSection";
import EmployeeMortgageRequestsPanel from "./EmployeeMortgageRequestsPanel";
import AdvisorRequestsPanel from "./AdvisorRequestsPanel";
import CompanyBenefitSummaryPanel from "./CompanyBenefitSummaryPanel";

const publicPaths = ["/", "/pricing", "/contact", "/partners"];

function MortgageServicesShell() {
  const location = useLocation();

  if (location.pathname === "/employee-portal") {
    return (
      <>
        <EmployeeMortgageRequestsPanel />
        <MortgageServicesSection
          compact
          showHeroCopy={false}
          ctaHref="/mortgage-request"
          secondaryHref="/employee/appointments"
          className="bg-slate-50"
        />
      </>
    );
  }

  if (location.pathname === "/hbt/member-dashboard" || location.pathname === "/hbt/dashboard") {
    return <AdvisorRequestsPanel />;
  }

  if (location.pathname === "/company/dashboard") {
    return <CompanyBenefitSummaryPanel />;
  }

  if (!publicPaths.includes(location.pathname)) return null;

  return <MortgageServicesSection ctaHref="/mortgage-request" secondaryHref="/contact" />;
}

export default MortgageServicesShell;
