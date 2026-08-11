import { useState, FormEvent } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const body: any = { name };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      await api.patch("/auth/me", body);
      setSuccess("Profile updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-mono text-amber-500 uppercase tracking-wider mb-1">Account</p>
        <h1 className="text-xl font-semibold text-paper-100">Profile</h1>
      </div>

      <div className="max-w-md bg-ink-800 rounded-lg border border-ink-700 p-6">
        <div className="mb-6 pb-6 border-b border-ink-700">
          <p className="text-xs font-mono uppercase tracking-wide text-paper-400 mb-1">Email</p>
          <p className="text-paper-100 font-mono">{user?.email}</p>
          <p className="text-xs font-mono uppercase tracking-wide text-paper-400 mt-3 mb-1">Role</p>
          <span className="inline-block px-2 py-0.5 rounded-full text-xs border bg-amber-500/15 text-amber-400 border-amber-500/30">
            {user?.role}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-paper-400 mb-1">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-md text-sm text-paper-100 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="pt-2 border-t border-ink-700">
            <p className="text-xs font-mono uppercase tracking-wide text-paper-400 mb-3 mt-4">Change Password (optional)</p>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-md text-sm text-paper-100 placeholder:text-paper-400/40 focus:outline-none focus:border-amber-500"
              />
              <input
                type="password"
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-md text-sm text-paper-100 placeholder:text-paper-400/40 focus:outline-none focus:border-amber-500"
                minLength={8}
              />
            </div>
          </div>

          {error && <p className="text-sm text-signal-500 bg-signal-500/10 border border-signal-500/30 rounded-md px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-moss-500 bg-moss-500/10 border border-moss-500/30 rounded-md px-3 py-2">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium py-2 rounded-md transition disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}