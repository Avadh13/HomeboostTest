type BrandLogoProps = {
  variant?: "full" | "icon";
  className?: string;
  iconClassName?: string;
};

function BrandLogo({ variant = "full", className = "", iconClassName = "" }: BrandLogoProps) {
  if (variant === "icon") {
    return <img src="/logo-icon.svg" alt="Employee Benefit Program" className={`block object-contain ${iconClassName || className}`} />;
  }

  return <img src="/logo.svg" alt="Employee Benefit Program — Home Buying and Mortgage Benefits" className={`block object-contain ${className}`} />;
}

export default BrandLogo;