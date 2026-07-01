import { useLocation } from "react-router-dom";
import EmployeeMortgageRequestsPanel from "./EmployeeMortgageRequestsPanel";
import AdvisorRequestsPanel from "./AdvisorRequestsPanel";

function DashboardRequestsShell() {
  const location = useLocation();

  if (location.pathname === "/employee-portal") {
    return <EmployeeMortgageRequestsPanel />;
  }

  if (location.pathname === "/hbt/member-dashboard") {
    return <AdvisorRequestsPanel />;
  }

  return null;
}

export default DashboardRequestsShell;
