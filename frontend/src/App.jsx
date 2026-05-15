import { useState, useEffect } from "react";

// Works locally (localhost) and on EC2 (uses same hostname as the page)
const API = `http://${window.location.hostname}:3001`;

const STATUS_COLORS = {
  open:          { bg: "#fff3cd", color: "#856404", label: "Open" },
  "in-progress": { bg: "#cce5ff", color: "#004085", label: "In Progress" },
  closed:        { bg: "#d4edda", color: "#155724", label: "Closed" },
};

const PRIORITY_COLORS = {
  low:    { bg: "#e2e3e5", color: "#383d41" },
  medium: { bg: "#fff3cd", color: "#856404" },
  high:   { bg: "#f8d7da", color: "#721c24" },
};

function Badge({ value, map }) {
  const s = map[value] || { bg: "#eee", color: "#333" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 10px", borderRadius: 12,
      fontSize: 12, fontWeight: 600, textTransform: "capitalize"
    }}>{value}</span>
  );
}

function Modal({ ticket, onClose, onSave }) {
  const [form, setForm] = useState(
    ticket || { title: "", status: "open", priority: "medium", assignee: "" }
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
    }}>
      <div style={{
        background: "#fff", borderRadius: 10, padding: 32,
        width: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.18)"
      }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>
          {ticket ? "Edit Ticket" : "New Ticket"}
        </h2>

        <label style={labelStyle}>Title</label>
        <input style={inputStyle} value={form.title}
          onChange={e => set("title", e.target.value)} placeholder="Describe the issue..." />

        <label style={labelStyle}>Status</label>
        <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>

        <label style={labelStyle}>Priority</label>
        <select style={inputStyle} value={form.priority} onChange={e => set("priority", e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <label style={labelStyle}>Assignee</label>
        <input style={inputStyle} value={form.assignee}
          onChange={e => set("assignee", e.target.value)} placeholder="Name (optional)" />

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button style={btnSecondary} onClick={onClose}>Cancel</button>
          <button style={btnPrimary} onClick={() => onSave(form)}>
            {ticket ? "Save Changes" : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tickets, setTickets]   = useState([]);
  const [filter, setFilter]     = useState({ status: "", search: "" });
  const [modal, setModal]       = useState(null); // null | "create" | ticket object
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const load = () => {
    setLoading(true);
    fetch(`${API}/tickets`)
      .then(r => r.json())
      .then(data => { setTickets(data); setLoading(false); })
      .catch(() => { setError("Cannot reach backend on port 3001"); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const createTicket = async (form) => {
    await fetch(`${API}/tickets`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setModal(null); load();
  };

  const updateTicket = async (form) => {
    await fetch(`${API}/tickets/${form.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setModal(null); load();
  };

  const deleteTicket = async (id) => {
    if (!confirm("Delete this ticket?")) return;
    await fetch(`${API}/tickets/${id}`, { method: "DELETE" });
    load();
  };

  const filtered = tickets.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    open:          tickets.filter(t => t.status === "open").length,
    "in-progress": tickets.filter(t => t.status === "in-progress").length,
    closed:        tickets.filter(t => t.status === "closed").length,
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f4f6fb" }}>
      {/* Header */}
      <div style={{ background: "#1976d2", color: "#fff", padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🎫 ITS Admin Portal</h1>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>IT Support Ticketing System</p>
        </div>
        <button style={btnWhite} onClick={() => setModal("create")}>+ New Ticket</button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Open",        count: counts.open,          color: "#856404", bg: "#fff3cd" },
            { label: "In Progress", count: counts["in-progress"], color: "#004085", bg: "#cce5ff" },
            { label: "Closed",      count: counts.closed,         color: "#155724", bg: "#d4edda" },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: s.bg, borderRadius: 10, padding: "16px 20px",
              textAlign: "center", color: s.color
            }}>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{s.count}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <input
            style={{ ...inputStyle, flex: 1, margin: 0 }}
            placeholder="🔍 Search tickets..."
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          />
          <select
            style={{ ...inputStyle, width: 160, margin: 0 }}
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Table */}
        {error && <div style={{ color: "red", padding: 16, background: "#fff0f0", borderRadius: 8, marginBottom: 16 }}>{error}</div>}
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#888" }}>Loading tickets...</div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                  {["ID", "Title", "Status", "Priority", "Assignee", "Created", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 13,
                      fontWeight: 600, color: "#495057" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#aaa" }}>
                    No tickets found
                  </td></tr>
                ) : filtered.map((t, i) => (
                  <tr key={t.id} style={{
                    borderBottom: "1px solid #f0f0f0",
                    background: i % 2 === 0 ? "#fff" : "#fafafa"
                  }}>
                    <td style={tdStyle}>#{t.id}</td>
                    <td style={{ ...tdStyle, fontWeight: 500, maxWidth: 260 }}>{t.title}</td>
                    <td style={tdStyle}><Badge value={t.status} map={STATUS_COLORS} /></td>
                    <td style={tdStyle}><Badge value={t.priority} map={PRIORITY_COLORS} /></td>
                    <td style={{ ...tdStyle, color: "#666" }}>{t.assignee || "—"}</td>
                    <td style={{ ...tdStyle, color: "#888", fontSize: 12 }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td style={tdStyle}>
                      <button style={btnEdit} onClick={() => setModal(t)}>Edit</button>
                      <button style={btnDelete} onClick={() => deleteTicket(t.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          ticket={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSave={modal === "create" ? createTicket : updateTicket}
        />
      )}
    </div>
  );
}

// --- Styles ---
const inputStyle = {
  display: "block", width: "100%", padding: "8px 12px",
  border: "1px solid #ced4da", borderRadius: 6, fontSize: 14,
  marginBottom: 12, boxSizing: "border-box", outline: "none"
};
const labelStyle = { fontSize: 13, fontWeight: 600, color: "#495057", marginBottom: 4, display: "block" };
const btnPrimary = {
  background: "#1976d2", color: "#fff", border: "none",
  padding: "9px 20px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14
};
const btnSecondary = {
  background: "#f0f0f0", color: "#333", border: "none",
  padding: "9px 20px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14
};
const btnWhite = {
  background: "#fff", color: "#1976d2", border: "none",
  padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 14
};
const btnEdit = {
  background: "#e3f2fd", color: "#1976d2", border: "none",
  padding: "4px 12px", borderRadius: 5, cursor: "pointer", fontSize: 12,
  fontWeight: 600, marginRight: 6
};
const btnDelete = {
  background: "#fdecea", color: "#c62828", border: "none",
  padding: "4px 12px", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 600
};
const tdStyle = { padding: "12px 16px", fontSize: 14, verticalAlign: "middle" };
