import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ customers: 0, products: 0, challans: 0, lowStock: 0 });

  useEffect(() => {
    async function loadStats() {
      const [customers, products, challans, lowStock] = await Promise.all([
        api.get("/customers?limit=1"),
        api.get("/products?limit=1"),
        api.get("/challans?limit=1"),
        api.get("/products/low-stock"),
      ]);
      setStats({
        customers: customers.data.pagination.total,
        products: products.data.pagination.total,
        challans: challans.data.pagination.total,
        lowStock: lowStock.data.length,
      });
    }
    loadStats();
  }, []);

  const cards = [
    { label: "Total Customers", value: stats.customers, code: "01" },
    { label: "Total Products", value: stats.products, code: "02" },
    { label: "Sales Challans", value: stats.challans, code: "03" },
    { label: "Low Stock Alerts", value: stats.lowStock, code: "04", alert: stats.lowStock > 0 },
  ];

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-mono text-amber-500 uppercase tracking-wider mb-1">
          Welcome back
        </p>
        <h1 className="text-2xl font-semibold text-paper-100">{user?.name}</h1>
        <p className="text-paper-400 text-sm mt-1 font-mono">Role: {user?.role}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`relative p-5 rounded-lg border ${
              c.alert
                ? "border-signal-500/40 bg-signal-500/5"
                : "border-ink-700 bg-ink-800"
            }`}
          >
            <span className="absolute top-3 right-3 font-mono text-xs text-paper-400/50">
              {c.code}
            </span>
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-2">{c.label}</p>
            <p className={`text-3xl font-semibold font-mono manifest-num ${c.alert ? "text-signal-500" : "text-paper-100"}`}>
              {String(c.value).padStart(2, "0")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}