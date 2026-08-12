import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

function Signup() {
  return (
    <main className="theme-page min-h-screen">
      <Navbar />
      <section className="relative px-4 py-12 md:px-6 lg:py-20">
        <div className="floating-orb -left-24 top-20 h-80 w-80 bg-blue-400" />
        <div className="floating-orb right-0 top-40 h-96 w-96 bg-violet-400" />

        <div className="section-container mx-auto max-w-3xl">
          <div className="premium-surface p-6 md:p-10 lg:p-12">
            <p className="eyebrow">Employee access</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">A secure invitation is required.</h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">
              Employee accounts can no longer be created with only an email address and employer slug. Open the one-time invitation link or use the invitation code provided by your employer or Home Buying Team.
            </p>

            <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
              <h2 className="text-xl font-black">Already received an invitation?</h2>
              <p className="mt-2 text-sm leading-relaxed text-emerald-800">
                Open the invitation link you received. It will validate the invitation, let you choose your password, and create the account only once.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="btn-primary">Sign In</Link>
              <Link to="/partners" className="btn-secondary">Find Employer Portal</Link>
              <Link to="/contact" className="btn-dark">Contact Support</Link>
            </div>

            <p className="mt-7 text-sm font-semibold text-slate-500">
              Need a new invitation? Ask your employer or Home Buying Team to resend it from their portal.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Signup;
