import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  customerType: string;
  status: string;
}
interface FollowUp {
  id: string;
  note: string;
  createdAt: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [newNote, setNewNote] = useState("");
  const [form, setForm] = useState({
    name: "", mobile: "", email: "", businessName: "",
    customerType: "RETAIL", status: "LEAD",
  });
  const [error, setError] = useState("");

  async function loadCustomers() {
    const res = await api.get("/customers", { params: { search } });
    setCustomers(res.data.data);
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/customers", form);
      setShowForm(false);
      setForm({ name: "", mobile: "", email: "", businessName: "", customerType: "RETAIL", status: "LEAD" });
      loadCustomers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add customer");
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    const res = await api.get(`/customers/${id}`);
    setFollowUps(res.data.followUps || []);
  }

  async function addFollowUp(customerId: string) {
    if (!newNote.trim()) return;
    await api.post(`/customers/${customerId}/followups`, { note: newNote });
    setNewNote("");
    const res = await api.get(`/customers/${customerId}`);
    setFollowUps(res.data.followUps || []);
  }

  const statusStyle: Record<string, string> = {
    ACTIVE: "bg-moss-500/15 text-moss-500 border-moss-500/30",
    LEAD: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    INACTIVE: "bg-ink-700 text-paper-400 border-ink-600",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-xs font-mono text-amber-500 uppercase tracking-wider mb-1">Module 02</p>
          <h1 className="text-xl font-semibold text-paper-100">Customers</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium px-4 py-2 rounded-md transition"
        >
          {showForm ? "Cancel" : "+ Add Customer"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-ink-800 p-4 rounded-lg border border-ink-700 mb-4 grid grid-cols-2 gap-3">
          <input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 placeholder:text-paper-400/50 focus:border-amber-500 focus:outline-none" />
          <input placeholder="Mobile" required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 placeholder:text-paper-400/50 focus:border-amber-500 focus:outline-none" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 placeholder:text-paper-400/50 focus:border-amber-500 focus:outline-none" />
          <input placeholder="Business Name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 placeholder:text-paper-400/50 focus:border-amber-500 focus:outline-none" />
          <select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })} className="bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 focus:border-amber-500 focus:outline-none">
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 focus:border-amber-500 focus:outline-none">
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          {error && <p className="col-span-2 text-sm text-signal-500">{error}</p>}
          <button type="submit" className="col-span-2 bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium py-2 rounded-md transition">
            Save Customer
          </button>
        </form>
      )}

      <input
        placeholder="Search by name, mobile, business..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 bg-ink-800 border border-ink-700 rounded-md px-3 py-2 text-sm text-paper-100 placeholder:text-paper-400/50 focus:border-amber-500 focus:outline-none"
      />

      <div className="bg-ink-800 rounded-lg border border-ink-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-950 text-paper-400 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Mobile</th>
              <th className="p-3">Business</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <>
                <tr key={c.id} className="border-t border-ink-700 hover:bg-ink-700/40 transition">
                  <td className="p-3 font-medium">
                    <Link to={`/customers/${c.id}`} className="text-amber-400 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-paper-200">{c.mobile}</td>
                  <td className="p-3 text-paper-400">{c.businessName || "—"}</td>
                  <td className="p-3 text-paper-400">{c.customerType}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${statusStyle[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleExpand(c.id)} className="text-xs text-amber-400 hover:underline font-mono">
                      {expandedId === c.id ? "Close" : "Follow-ups →"}
                    </button>
                  </td>
                </tr>
                {expandedId === c.id && (
                  <tr className="bg-ink-900/60 border-t border-ink-700">
                    <td colSpan={6} className="p-4">
                      <p className="text-xs font-mono text-amber-500 uppercase tracking-wide mb-2">Follow-up Notes</p>
                      <div className="space-y-2 mb-3">
                        {followUps.length === 0 && (
                          <p className="text-xs text-paper-400">No follow-ups logged yet.</p>
                        )}
                        {followUps.map((f) => (
                          <div key={f.id} className="text-sm bg-ink-800 border border-ink-700 rounded-md p-2">
                            <p className="text-paper-100">{f.note}</p>
                            <p className="text-xs text-paper-400 font-mono mt-1">
                              {new Date(f.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          placeholder="Add a follow-up note..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="flex-1 bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100 placeholder:text-paper-400/50 focus:border-amber-500 focus:outline-none"
                        />
                        <button
                          onClick={() => addFollowUp(c.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium px-4 py-2 rounded-md transition"
                        >
                          Add
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-paper-400">No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}