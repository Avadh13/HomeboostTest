import { useLocation } from "react-router-dom";
import Footer from "./Footer";

const hiddenPrefixes = [
  "/admin",
  "/employee",
  "/company",
  "/hbt",
  "/resources",
  "/quiz",
  "/notifications",
  "/profile",
];

function FooterShell() {
  const location = useLocation();
  const shouldHide = hiddenPrefixes.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));

  if (shouldHide) return null;

  return <Footer />;
}

export default FooterShell;
