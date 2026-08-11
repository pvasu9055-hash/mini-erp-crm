import { useEffect, useState, FormEvent } from "react";
import api from "../api/client";

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unitPrice: string;
  stock: number;
  minStock: number;
  location?: string;
}
interface Movement {
  id: string;
  quantity: number;
  movementType: "IN" | "OUT";
  reason: string;
  createdAt: string;
  createdBy: { name: string };
}

const emptyForm = { name: "", sku: "", category: "", unitPrice: "", stock: "0", minStock: "0", location: "" };

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [adjustForm, setAdjustForm] = useState({ quantity: "1", movementType: "IN", reason: "" });

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState("");

  async function loadProducts() {
    const res = await api.get("/products");
    setProducts(res.data.data);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/products", {
        ...form,
        unitPrice: parseFloat(form.unitPrice),
        stock: parseInt(form.stock),
        minStock: parseInt(form.minStock),
      });
      setShowForm(false);
      setForm(emptyForm);
      loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add product");
    }
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setExpandedId(null);
    setEditError("");
    setEditForm({
      name: p.name,
      sku: p.sku,
      category: p.category || "",
      unitPrice: String(p.unitPrice),
      stock: String(p.stock),
      minStock: String(p.minStock),
      location: p.location || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
    setEditError("");
  }

  async function submitEdit(e: FormEvent, productId: string) {
    e.preventDefault();
    setEditError("");
    try {
      await api.put(`/products/${productId}`, {
        ...editForm,
        unitPrice: parseFloat(editForm.unitPrice),
        stock: parseInt(editForm.stock),
        minStock: parseInt(editForm.minStock),
      });
      setEditingId(null);
      loadProducts();
    } catch (err: any) {
      setEditError(err.response?.data?.error || "Failed to update product");
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setEditingId(null);
    setExpandedId(id);
    const res = await api.get(`/products/${id}/stock-movements`);
    setMovements(res.data);
  }

  async function submitAdjustment(productId: string) {
    if (!adjustForm.reason.trim()) return;
    await api.post(`/products/${productId}/stock-movement`, {
      quantity: parseInt(adjustForm.quantity),
      movementType: adjustForm.movementType,
      reason: adjustForm.reason,
    });
    setAdjustForm({ quantity: "1", movementType: "IN", reason: "" });
    const res = await api.get(`/products/${productId}/stock-movements`);
    setMovements(res.data);
    loadProducts();
  }

  const inputClass =
    "bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 placeholder:text-paper-400/50 focus:border-amber-500 focus:outline-none";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-xs font-mono text-amber-500 uppercase tracking-wider mb-1">Module 03</p>
          <h1 className="text-xl font-semibold text-paper-100">Products & Inventory</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium px-4 py-2 rounded-md transition"
        >
          {showForm ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className={`bg-ink-800 p-4 rounded-lg border border-ink-700 mb-4 grid grid-cols-3 gap-3`}>
          <input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          <input placeholder="SKU" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={`${inputClass} font-mono`} />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
          <input placeholder="Unit Price" type="number" step="0.01" required value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className={inputClass} />
          <input placeholder="Initial Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputClass} />
          <input placeholder="Min Stock Alert" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className={inputClass} />
          <input placeholder="Location/Warehouse" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={`${inputClass} col-span-3`} />
          {error && <p className="col-span-3 text-sm text-signal-500">{error}</p>}
          <button type="submit" className="col-span-3 bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium py-2 rounded-md transition">
            Save Product
          </button>
        </form>
      )}

      <div className="bg-ink-800 rounded-lg border border-ink-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-950 text-paper-400 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Location</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <>
                <tr key={p.id} className="border-t border-ink-700 hover:bg-ink-700/40 transition">
                  <td className="p-3 font-medium text-paper-100">{p.name}</td>
                  <td className="p-3 font-mono text-paper-200">{p.sku}</td>
                  <td className="p-3 text-paper-400">{p.category || "—"}</td>
                  <td className="p-3 font-mono text-paper-200">₹{p.unitPrice}</td>
                  <td className="p-3">
                    <span className={`font-mono manifest-num ${p.stock <= p.minStock ? "text-signal-500 font-semibold" : "text-paper-100"}`}>
                      {p.stock}
                    </span>
                    {p.stock <= p.minStock && <span className="ml-1 text-xs text-signal-500">(low)</span>}
                  </td>
                  <td className="p-3 text-paper-400">{p.location || "—"}</td>
                  <td className="p-3 space-x-3">
                    <button onClick={() => startEdit(p)} className="text-xs text-amber-400 hover:underline font-mono">
                      Edit
                    </button>
                    <button onClick={() => toggleExpand(p.id)} className="text-xs text-amber-400 hover:underline font-mono">
                      {expandedId === p.id ? "Close" : "Movements →"}
                    </button>
                  </td>
                </tr>

                {editingId === p.id && (
                  <tr className="bg-ink-900/60 border-t border-ink-700">
                    <td colSpan={7} className="p-4">
                      <p className="text-xs font-mono text-amber-500 uppercase tracking-wide mb-2">Edit Product</p>
                      <form onSubmit={(e) => submitEdit(e, p.id)} className="grid grid-cols-3 gap-3">
                        <input placeholder="Name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} />
                        <input placeholder="SKU" required value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} className={`${inputClass} font-mono`} />
                        <input placeholder="Category" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className={inputClass} />
                        <input placeholder="Unit Price" type="number" step="0.01" required value={editForm.unitPrice} onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })} className={inputClass} />
                        <input placeholder="Stock" type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} className={inputClass} />
                        <input placeholder="Min Stock Alert" type="number" value={editForm.minStock} onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })} className={inputClass} />
                        <input placeholder="Location/Warehouse" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className={`${inputClass} col-span-3`} />
                        {editError && <p className="col-span-3 text-sm text-signal-500">{editError}</p>}
                        <div className="col-span-3 flex gap-2">
                          <button type="button" onClick={cancelEdit} className="flex-1 border border-ink-600 text-paper-100 text-sm py-2 rounded-md hover:bg-ink-700 transition">
                            Cancel
                          </button>
                          <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium py-2 rounded-md transition">
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}

                {expandedId === p.id && (
                  <tr className="bg-ink-900/60 border-t border-ink-700">
                    <td colSpan={7} className="p-4">
                      <p className="text-xs font-mono text-amber-500 uppercase tracking-wide mb-2">Stock Movement Log</p>
                      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
                        {movements.length === 0 && (
                          <p className="text-xs text-paper-400">No movements logged yet.</p>
                        )}
                        {movements.map((m) => (
                          <div key={m.id} className="flex items-center justify-between text-sm bg-ink-800 border border-ink-700 rounded-md px-3 py-2">
                            <div className="flex items-center gap-3">
                              <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${m.movementType === "IN" ? "bg-moss-500/15 text-moss-500" : "bg-signal-500/15 text-signal-500"}`}>
                                {m.movementType}
                              </span>
                              <span className="text-paper-100">{m.reason}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-paper-400 font-mono">
                              <span>{m.movementType === "IN" ? "+" : "−"}{m.quantity}</span>
                              <span>{m.createdBy?.name}</span>
                              <span>{new Date(m.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={adjustForm.movementType}
                          onChange={(e) => setAdjustForm({ ...adjustForm, movementType: e.target.value })}
                          className={inputClass}
                        >
                          <option value="IN">IN</option>
                          <option value="OUT">OUT</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={adjustForm.quantity}
                          onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                          className={`w-20 ${inputClass}`}
                        />
                        <input
                          placeholder="Reason (e.g. new purchase, damage)"
                          value={adjustForm.reason}
                          onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                          className={`flex-1 ${inputClass}`}
                        />
                        <button
                          onClick={() => submitAdjustment(p.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium px-4 py-2 rounded-md transition"
                        >
                          Log
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center text-paper-400">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}