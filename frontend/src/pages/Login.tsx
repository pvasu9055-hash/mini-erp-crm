import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex bg-ink-900">
      {/* Left: form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            <h1 className="text-lg font-semibold text-paper-100 tracking-tight">MINI ERP + CRM</h1>
          </div>
          <p className="text-sm text-paper-400 mb-8 font-mono">Sign in to the operations portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-paper-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 bg-ink-800 border border-ink-600 rounded-md text-sm text-paper-100 placeholder:text-paper-400/40 focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-paper-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-ink-800 border border-ink-600 rounded-md text-sm text-paper-100 placeholder:text-paper-400/40 focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-signal-500 bg-signal-500/10 border border-signal-500/30 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-semibold py-2.5 rounded-md transition disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-paper-400 mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-amber-400 hover:underline font-medium">Create one</Link>
          </p>
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink-950 border-l border-ink-700 items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#F0B85A 1px, transparent 1px), linear-gradient(90deg, #F0B85A 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 max-w-md px-10">
          <p className="text-xs font-mono text-amber-500 uppercase tracking-wider mb-4">Operations Portal</p>
          <h2 className="text-3xl font-semibold text-paper-100 leading-tight mb-6">
            Customers, stock, and challans — one manifest.
          </h2>
          <div className="space-y-3">
            {[
              { code: "01", label: "Customer relationship tracking" },
              { code: "02", label: "Live inventory & stock movement log" },
              { code: "03", label: "Sales challans with draft/confirm flow" },
              { code: "04", label: "Role-based access for every team" },
            ].map((f) => (
              <div key={f.code} className="flex items-center gap-3 text-sm text-paper-300">
                <span className="font-mono text-xs text-amber-500 w-6">{f.code}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}