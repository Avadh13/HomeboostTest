import { useLocation } from "react-router-dom";
import MortgageServicesSection from "./MortgageServicesSection";
import EmployeeMortgageRequestsPanel from "./EmployeeMortgageRequestsPanel";
import AdvisorRequestsPanel from "./AdvisorRequestsPanel";
import CompanyBenefitSummaryPanel from "./CompanyBenefitSummaryPanel";
import EmployeeDocumentChecklistWidget from "./EmployeeDocumentChecklistWidget";
import AdvisorDocumentReviewWidget from "./AdvisorDocumentReviewWidget";

const publicPaths = ["/", "/pricing", "/contact", "/partners"];

function MortgageServicesShell() {
  const location = useLocation();

  if (location.pathname === "/employee-portal") {
    return (
      <>
        <EmployeeMortgageRequestsPanel />
        <EmployeeDocumentChecklistWidget />
      </>
    );
  }

  if (location.pathname === "/hbt/member-dashboard" || location.pathname === "/hbt/dashboard") {
    return (
      <>
        <AdvisorRequestsPanel />
        <AdvisorDocumentReviewWidget />
      </>
    );
  }

  if (location.pathname === "/company/dashboard") {
    return <CompanyBenefitSummaryPanel />;
  }

  if (!publicPaths.includes(location.pathname)) return null;

  return <MortgageServicesSection ctaHref="/mortgage-request" secondaryHref="/contact" />;
}

export default MortgageServicesShell;