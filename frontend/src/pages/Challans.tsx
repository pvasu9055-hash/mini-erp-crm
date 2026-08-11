import { useEffect, useState, FormEvent } from "react";
import api from "../api/client";

interface Challan {
  id: string;
  challanNumber: string;
  status: string;
  totalQuantity: number;
  customer: { name: string; mobile: string };
  items: { productNameSnap: string; quantity: number }[];
}
interface Customer { id: string; name: string; mobile: string }
interface Product { id: string; name: string; sku: string; stock: number; unitPrice: string }

export default function Challans() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 1 },
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadAll() {
    const [c, cu, p] = await Promise.all([
      api.get("/challans"),
      api.get("/customers", { params: { limit: 100 } }),
      api.get("/products", { params: { limit: 100 } }),
    ]);
    setChallans(c.data.data);
    setCustomers(cu.data.data);
    setProducts(p.data.data);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function addItemRow() {
    setItems([...items, { productId: "", quantity: 1 }]);
  }
  function updateItem(index: number, field: "productId" | "quantity", value: string) {
    const next = [...items];
    if (field === "quantity") next[index].quantity = parseInt(value) || 1;
    else next[index].productId = value;
    setItems(next);
  }
  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function submitChallan(e: FormEvent, status: "DRAFT" | "CONFIRMED") {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await api.post("/challans", {
        customerId,
        items: items.filter((i) => i.productId),
        status,
      });
      setSuccess(`Challan ${res.data.challanNumber} created as ${status}.`);
      setShowForm(false);
      setCustomerId("");
      setItems([{ productId: "", quantity: 1 }]);
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create challan");
    }
  }

  async function confirmChallan(id: string) {
    setError("");
    try {
      await api.patch(`/challans/${id}/confirm`);
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to confirm challan");
    }
  }

  async function cancelChallan(id: string) {
    setError("");
    try {
      await api.patch(`/challans/${id}/cancel`);
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to cancel challan");
    }
  }

  const statusStyle: Record<string, string> = {
    CONFIRMED: "bg-moss-500/15 text-moss-500 border-moss-500/30",
    DRAFT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    CANCELLED: "bg-ink-700 text-paper-400 border-ink-600",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-xs font-mono text-amber-500 uppercase tracking-wider mb-1">Module 04</p>
          <h1 className="text-xl font-semibold text-paper-100">Sales Challans</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium px-4 py-2 rounded-md transition"
        >
          {showForm ? "Cancel" : "+ New Challan"}
        </button>
      </div>

      {success && <p className="mb-3 text-sm text-moss-500 bg-moss-500/10 border border-moss-500/30 rounded-md px-3 py-2">{success}</p>}
      {error && <p className="mb-3 text-sm text-signal-500 bg-signal-500/10 border border-signal-500/30 rounded-md px-3 py-2">{error}</p>}

      {showForm && (
        <form className="bg-ink-800 p-4 rounded-lg border border-ink-700 mb-4 space-y-3">
          <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 focus:border-amber-500 focus:outline-none">
            <option value="">Select Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>
            ))}
          </select>

          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <select
                required
                value={item.productId}
                onChange={(e) => updateItem(idx, "productId", e.target.value)}
                className="flex-1 bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock}) - ₹{p.unitPrice}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                className="w-24 bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 font-mono focus:border-amber-500 focus:outline-none"
              />
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} className="text-signal-500 text-sm px-2 hover:text-signal-600">✕</button>
              )}
            </div>
          ))}

          <button type="button" onClick={addItemRow} className="text-sm text-amber-400 hover:underline">
            + Add another product
          </button>

          <div className="flex gap-2 pt-2">
            <button
              onClick={(e) => submitChallan(e, "DRAFT")}
              className="flex-1 border border-ink-600 text-paper-100 text-sm py-2 rounded-md hover:bg-ink-700 transition"
            >
              Save as Draft
            </button>
            <button
              onClick={(e) => submitChallan(e, "CONFIRMED")}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium py-2 rounded-md transition"
            >
              Confirm & Reduce Stock
            </button>
          </div>
        </form>
      )}

      <div className="bg-ink-800 rounded-lg border border-ink-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-950 text-paper-400 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="p-3">Challan #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Items</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {challans.map((c) => (
              <tr key={c.id} className="border-t border-ink-700 hover:bg-ink-700/40 transition">
                <td className="p-3 font-mono font-medium text-amber-400">{c.challanNumber}</td>
                <td className="p-3 text-paper-100">{c.customer.name}</td>
                <td className="p-3 text-xs text-paper-400">
                  {c.items.map((i) => `${i.productNameSnap} x${i.quantity}`).join(", ")}
                </td>
                <td className="p-3 font-mono text-paper-200">{c.totalQuantity}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${statusStyle[c.status]}`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-3 space-x-3">
                  {c.status === "DRAFT" && (
                    <button onClick={() => confirmChallan(c.id)} className="text-xs text-amber-400 hover:underline font-mono">Confirm</button>
                  )}
                  {c.status !== "CANCELLED" && (
                    <button onClick={() => cancelChallan(c.id)} className="text-xs text-signal-500 hover:underline font-mono">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {challans.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-paper-400">No challans yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}