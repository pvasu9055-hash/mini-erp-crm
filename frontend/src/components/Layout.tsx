import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", code: "01" },
  { to: "/customers", label: "Customers", code: "02" },
  { to: "/products", label: "Products", code: "03" },
  { to: "/challans", label: "Sales Challans", code: "04" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const items = user?.role === "ADMIN"
    ? [...navItems, { to: "/users", label: "Users", code: "05" }]
    : navItems;

  return (
    <div className="flex min-h-screen bg-ink-900">
      <aside className="w-64 bg-ink-950 border-r border-ink-700 flex flex-col">
        <div className="p-5 border-b border-ink-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            <h1 className="text-base font-semibold tracking-tight text-paper-100">MINI ERP+CRM</h1>
          </div>
          <p className="text-xs text-paper-400 mt-1 font-mono">Operations Portal</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500"
                    : "text-paper-400 hover:bg-ink-800 hover:text-paper-100 border-l-2 border-transparent"
                }`
              }
            >
              <span className="font-mono text-xs opacity-60">{item.code}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-ink-700 text-sm">
          <NavLink to="/profile" className="block hover:opacity-80 transition mb-3">
            <p className="font-medium text-paper-100">{user?.name}</p>
            <p className="text-paper-400 text-xs font-mono uppercase tracking-wide">{user?.role}</p>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-paper-400 hover:text-signal-500 transition"
          >
            Log out →
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}