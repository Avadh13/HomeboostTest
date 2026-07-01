type BrandLogoProps = {
  variant?: "full" | "icon";
  className?: string;
  iconClassName?: string;
};

function BrandLogo({ variant = "full", className = "", iconClassName = "" }: BrandLogoProps) {
  if (variant === "icon") {
    return <img src="/logo-icon.svg" alt="HomeBoost" className={`block object-contain ${iconClassName || className}`} />;
  }

  return <img src="/logo.svg" alt="HomeBoost Employee Benefit Program" className={`block object-contain ${className}`} />;
}

export default BrandLogo;
