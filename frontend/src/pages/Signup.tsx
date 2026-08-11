import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "SALES" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900">
      <div className="w-full max-w-sm bg-ink-800 p-8 rounded-lg border border-ink-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
          <h1 className="text-lg font-semibold text-paper-100 tracking-tight">MINI ERP + CRM</h1>
        </div>
        <p className="text-sm text-paper-400 mb-6 font-mono">Create your operations account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-paper-400 mb-1">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-md text-sm text-paper-100 focus:outline-none focus:border-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-paper-400 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-md text-sm text-paper-100 focus:outline-none focus:border-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-paper-400 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-md text-sm text-paper-100 focus:outline-none focus:border-amber-500"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-paper-400 mb-1">Department</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-md text-sm text-paper-100 focus:outline-none focus:border-amber-500"
            >
              <option value="SALES">Sales</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="ACCOUNTS">Accounts</option>
            </select>
            <p className="text-xs text-paper-400 mt-1">
              Admin access is granted by an existing admin, not selected here.
            </p>
          </div>

          {error && <p className="text-sm text-signal-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium py-2 rounded-md transition disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-paper-400 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-amber-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}