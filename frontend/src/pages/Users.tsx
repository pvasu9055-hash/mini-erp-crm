import { useEffect, useState } from "react";
import api from "../api/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLES = ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"];

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadUsers() {
    const res = await api.get("/users");
    setUsers(res.data);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function changeRole(userId: string, role: string) {
    setError("");
    setUpdatingId(userId);
    try {
      await api.patch(`/users/${userId}/role`, { role });
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-mono text-amber-500 uppercase tracking-wider mb-1">Module 05</p>
        <h1 className="text-xl font-semibold text-paper-100">User Management</h1>
        <p className="text-sm text-paper-400 mt-1">Admin only — assign roles to team members.</p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-signal-500 bg-signal-500/10 border border-signal-500/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-ink-800 rounded-lg border border-ink-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-950 text-paper-400 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-ink-700 hover:bg-ink-700/40 transition">
                <td className="p-3 font-medium text-paper-100">{u.name}</td>
                <td className="p-3 font-mono text-paper-300">{u.email}</td>
                <td className="p-3">
                  <select
                    value={u.role}
                    disabled={updatingId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="bg-ink-900 border border-ink-600 rounded-md px-2 py-1.5 text-sm text-paper-100 focus:border-amber-500 focus:outline-none disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3 text-paper-400 font-mono text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-paper-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}