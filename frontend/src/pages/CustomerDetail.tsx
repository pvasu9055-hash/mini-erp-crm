import { useEffect, useState, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";

interface FollowUp {
  id: string;
  note: string;
  createdAt: string;
}

interface CustomerDetail {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: string;
  address?: string;
  status: string;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
  followUps: FollowUp[];
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<CustomerDetail>>({});
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data);
      setForm(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load customer");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.put(`/customers/${id}`, {
        name: form.name,
        mobile: form.mobile,
        email: form.email,
        businessName: form.businessName,
        gstNumber: form.gstNumber,
        customerType: form.customerType,
        address: form.address,
        status: form.status,
        followUpDate: form.followUpDate,
        notes: form.notes,
      });
      setSuccess("Customer updated successfully.");
      setEditMode(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update customer");
    }
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setError("");
    try {
      await api.post(`/customers/${id}/followups`, { note: newNote });
      setNewNote("");
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add follow-up note");
    }
  }

  if (!customer) {
    return <div className="text-paper-400">Loading customer...</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate("/customers")}
        className="text-sm text-amber-400 hover:underline mb-4 inline-block"
      >
        ← Back to Customers
      </button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs font-mono text-amber-500 uppercase tracking-wider mb-1">
            Customer Detail
          </p>
          <h1 className="text-xl font-semibold text-paper-100">{customer.name}</h1>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium px-4 py-2 rounded-md transition"
        >
          {editMode ? "Cancel" : "Edit Customer"}
        </button>
      </div>

      {success && (
        <p className="mb-3 text-sm text-moss-500 bg-moss-500/10 border border-moss-500/30 rounded-md px-3 py-2">
          {success}
        </p>
      )}
      {error && (
        <p className="mb-3 text-sm text-signal-500 bg-signal-500/10 border border-signal-500/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {editMode ? (
        <form
          onSubmit={handleSave}
          className="bg-ink-800 p-4 rounded-lg border border-ink-700 mb-6 grid grid-cols-2 gap-3"
        >
          <div>
            <label className="block text-xs text-paper-400 mb-1">Name</label>
            <input
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
            />
          </div>
          <div>
            <label className="block text-xs text-paper-400 mb-1">Mobile</label>
            <input
              value={form.mobile || ""}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
            />
          </div>
          <div>
            <label className="block text-xs text-paper-400 mb-1">Email</label>
            <input
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
            />
          </div>
          <div>
            <label className="block text-xs text-paper-400 mb-1">Business Name</label>
            <input
              value={form.businessName || ""}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
            />
          </div>
          <div>
            <label className="block text-xs text-paper-400 mb-1">GST Number</label>
            <input
              value={form.gstNumber || ""}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
              className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
            />
          </div>
          <div>
            <label className="block text-xs text-paper-400 mb-1">Customer Type</label>
            <select
              value={form.customerType || "RETAIL"}
              onChange={(e) => setForm({ ...form, customerType: e.target.value })}
              className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
            >
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-paper-400 mb-1">Status</label>
            <select
              value={form.status || "LEAD"}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
            >
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-paper-400 mb-1">Follow-up Date</label>
            <input
              type="date"
              value={form.followUpDate ? form.followUpDate.slice(0, 10) : ""}
              onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
              className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-paper-400 mb-1">Address</label>
            <input
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-paper-400 mb-1">Notes</label>
            <textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
            />
          </div>
          <button
            type="submit"
            className="col-span-2 bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium py-2 rounded-md transition"
          >
            Save Changes
          </button>
        </form>
      ) : (
        <div className="bg-ink-800 rounded-lg border border-ink-700 p-6 mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-1">Mobile</p>
            <p className="text-paper-100">{customer.mobile}</p>
          </div>
          <div>
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-1">Email</p>
            <p className="text-paper-100">{customer.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-1">Business Name</p>
            <p className="text-paper-100">{customer.businessName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-1">GST Number</p>
            <p className="text-paper-100">{customer.gstNumber || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-1">Customer Type</p>
            <p className="text-paper-100">{customer.customerType}</p>
          </div>
          <div>
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-1">Status</p>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {customer.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-1">Follow-up Date</p>
            <p className="text-paper-100">
              {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-1">Customer Since</p>
            <p className="text-paper-100">{new Date(customer.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-1">Address</p>
            <p className="text-paper-100">{customer.address || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-paper-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-paper-100">{customer.notes || "—"}</p>
          </div>
        </div>
      )}

      <div className="bg-ink-800 rounded-lg border border-ink-700 p-6">
        <p className="text-xs font-mono text-amber-500 uppercase tracking-wider mb-3">
          Follow-up Notes
        </p>

        {customer.followUps.length === 0 ? (
          <p className="text-sm text-paper-400 mb-4">No follow-ups logged yet.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {customer.followUps.map((f) => (
              <div key={f.id} className="text-sm border-l-2 border-amber-500/40 pl-3 py-1">
                <p className="text-paper-100">{f.note}</p>
                <p className="text-xs text-paper-400 mt-0.5">
                  {new Date(f.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a follow-up note..."
            className="flex-1 bg-ink-900 border border-ink-600 rounded-md px-3 py-2 text-sm text-paper-100"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-600 text-ink-950 text-sm font-medium px-4 py-2 rounded-md transition"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}