import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/api";

const loginImage =
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const redirectByRole = (role: string, redirectTo?: string) => {
    if (redirectTo) {
      navigate(redirectTo);
      return;
    }

    if (role === "admin" || role === "super_admin") {
      navigate("/admin");
      return;
    }

    if (role === "hbt_admin") {
      navigate("/hbt/dashboard");
      return;
    }

    if (role === "hbt_member") {
      navigate("/hbt/member-dashboard");
      return;
    }

    if (role === "employee") {
      navigate("/employee-portal");
      return;
    }

    alert(`Unknown role: ${role}`);
    navigate("/");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Login failed");
        return;
      }

      if (!data.token || !data.user) {
        alert("Login response is missing token or user data.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      redirectByRole(data.user.role, data.redirect_to);
    } catch (error) {
      console.log("Login error:", error);
      alert("Backend is not running or login API failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src={loginImage}
          alt="Modern home interior"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/85 via-blue-900/55 to-transparent" />

        <div className="absolute bottom-10 left-10 right-10 rounded-[2rem] bg-white/15 p-8 text-white backdrop-blur-xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-100">
            One login
          </p>

          <h2 className="mt-3 text-4xl font-black">
            Same door. Different dashboard.
          </h2>

          <p className="mt-4 max-w-xl text-blue-50">
            Super Admin, HBT Admin, HBT Team Members, and Employees all start
            here. The system reads the role and sends each user to the right
            place.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 font-black text-white shadow-lg shadow-blue-500/30">
              HB
            </span>

            <div>
              <p className="text-2xl font-black">HomeBoost</p>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                Employee Benefit
              </p>
            </div>
          </Link>

          <form
            onSubmit={handleLogin}
            className="rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-200/70"
          >
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Welcome back
            </p>

            <h1 className="mt-2 text-4xl font-black">Login</h1>

            <p className="mt-3 text-slate-600">
              Use your assigned account credentials to access your role-based
              dashboard.
            </p>

            <div className="mt-7 space-y-4">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-6 w-full disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm text-slate-700">
              <p className="font-black text-blue-700">Need access?</p>

              <p className="mt-2">
                Employees should start from their employer portal link. HBT team
                members should use the login provided by their HBT Admin.
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-slate-600">
              Employee?{" "}
              <Link to="/partners" className="font-bold text-blue-700">
                Start from your employer page
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Login;