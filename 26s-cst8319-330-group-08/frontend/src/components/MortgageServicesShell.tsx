import { useLocation } from "react-router-dom";
import MortgageServicesSection from "./MortgageServicesSection";

const publicPaths = ["/", "/pricing", "/contact", "/partners"];

function MortgageServicesShell() {
  const location = useLocation();
  const showOnPublicPage = publicPaths.includes(location.pathname);

  if (!showOnPublicPage) return null;

  return <MortgageServicesSection ctaHref="/login" secondaryHref="/contact" />;
}

export default MortgageServicesShell;
