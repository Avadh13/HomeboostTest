import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="border-t bg-white px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-black text-slate-950">HomeBoost Employee Benefit</p>
          <p>Employer home-buying benefit platform.</p>
        </div>
        <div className="flex gap-5 font-semibold">
          <Link to="/partners" className="hover:text-blue-700">Partner Portals</Link>
          <Link to="/contact" className="hover:text-blue-700">Contact</Link>
          <Link to="/login" className="hover:text-blue-700">Login</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
