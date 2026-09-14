import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import { QRCodeSVG } from "qrcode.react";
import L from "leaflet";
import { apiFetch, getUser, login, logout } from "./api";

// Role-based menu definitions
const ROLE_MENUS = {
  admin: ["dashboard", "inventory", "consumption", "assets", "work-orders", "indents", "shipments", "personnel", "whatif", "packing", "alerts", "audit"],
  logistics_officer: ["dashboard", "inventory", "assets", "work-orders", "indents", "shipments", "personnel", "whatif", "packing", "alerts"],
  station_manager: ["dashboard", "inventory", "consumption", "assets", "work-orders", "indents", "shipments", "personnel", "alerts"]
};

const ROLE_LABELS = {
  admin: "Admin / Expedition Planner",
  logistics_officer: "Logistics Officer",
  station_manager: "Station Manager"
};

const MENU_ITEMS = {
  dashboard: { label: "Dashboard", icon: "🏠" },
  inventory: { label: "Inventory", icon: "📦" },
  consumption: { label: "Consumption", icon: "📊" },
  assets: { label: "Assets", icon: "⚙️" },
  "work-orders": { label: "Work Orders", icon: "🔧" },
  indents: { label: "Cargo Indents", icon: "📋" },
  shipments: { label: "Shipments", icon: "🚢" },
  personnel: { label: "Personnel", icon: "👥" },
  whatif: { label: "What-if Simulator", icon: "⚠️" },
  packing: { label: "Smart Packing", icon: "🎯" },
  alerts: { label: "Alerts", icon: "🔔" },
  audit: { label: "Audit Trail", icon: "📝" }
};

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

export default function App() {
  const [user, setUser] = useState(getUser());
  const [page, setPage] = useState("dashboard");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (user && !ROLE_MENUS[user.role]?.includes(page)) {
      setPage("dashboard");
    }
  }, [user, page]);

  async function resetDemo() {
    if (!confirm("Reset all demo data? This cannot be undone.")) return;
    try {
      await apiFetch("/reset", { method: "POST" });
      setNotice("Demo data reset successfully.");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      alert(error.message);
    }
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const allowedMenus = ROLE_MENUS[user.role] || [];

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>PolarOps</h1>
        <div className="subtitle">
          Integrated Polar Expedition Logistics
        </div>

        <div className="user-box">
          <strong>{user.name}</strong>
          <small>{ROLE_LABELS[user.role]}</small>
        </div>

        {allowedMenus.map((key) => (
          <button
            key={key}
            className={page === key ? "active" : ""}
            onClick={() => setPage(key)}
          >
            {MENU_ITEMS[key].icon} {MENU_ITEMS[key].label}
          </button>
        ))}

        {user.role === "admin" && (
          <button className="danger" onClick={resetDemo}>
            🔄 Reset Demo Data
          </button>
        )}

        <button
          onClick={() => { logout(); setUser(null); setPage("dashboard"); }}
        >
          🚪 Logout
        </button>
      </aside>

      <main className="main">
        {notice && <div className="notice">{notice}</div>}

        {page === "dashboard" && <Dashboard />}
        {page === "inventory" && <Inventory />}
        {page === "consumption" && <Consumption />}
        {page === "assets" && <Assets />}
        {page === "work-orders" && <WorkOrders />}
        {page === "indents" && <Indents />}
        {page === "shipments" && <Shipments />}
        {page === "personnel" && <Personnel />}
        {page === "whatif" && <WhatIf />}
        {page === "packing" && <PackingOptimizer />}
        {page === "alerts" && <Alerts />}
        {page === "audit" && <AuditTrail />}
      </main>
    </div>
  );
}

// ============ LOGIN ============

function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@polarops.demo");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const quickUsers = [
    { label: "👤 Admin / Expedition Planner", email: "admin@polarops.demo", password: "admin123", role: "admin" },
    { label: "📦 Logistics Officer", email: "logistics@polarops.demo", password: "logistics123", role: "logistics_officer" },
    { label: "🏔️ Station Manager", email: "station@polarops.demo", password: "station123", role: "station_manager" }
  ];

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>🏔️ PolarOps</h1>
        <p>Integrated Polar Expedition Logistics and Asset Management</p>
        <p className="muted">Select a role to explore:</p>

        <div className="quick-users">
          {quickUsers.map((u) => (
            <button key={u.email} onClick={() => { setEmail(u.email); setPassword(u.password); }}>
              {u.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ HELPERS ============

function Loading() { return <div className="muted">Loading...</div>; }
function ErrorBox({ message }) { return <div className="error">{message}</div>; }
function RiskBadge({ risk }) { return <span className={`badge ${risk}`}>{risk}</span>; }

// ============ DASHBOARD ============

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/dashboard/summary")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Operational overview for {data.station.name}</p>

      <div className="card-grid">
        <div className="card">
          <h3>Station</h3>
          <div className="value">{data.station.name}</div>
          <div className="muted small">Next resupply: {data.station.next_resupply_date}</div>
        </div>
        <div className="card">
          <h3>Overall Risk</h3>
          <div className="value"><RiskBadge risk={data.overall_risk} /></div>
        </div>
        <div className="card">
          <h3>Critical / High Risk Items</h3>
          <div className="value">{data.inventory.critical_items}</div>
        </div>
        <div className="card">
          <h3>Low Stock Items</h3>
          <div className="value">{data.inventory.low_stock_items}</div>
        </div>
        <div className="card">
          <h3>Operational Assets</h3>
          <div className="value">{data.assets.operational}</div>
          <div className="muted small">Maintenance due: {data.assets.maintenance_due}</div>
        </div>
        <div className="card">
          <h3>Personnel On Station</h3>
          <div className="value">{data.personnel.on_station}</div>
        </div>
        <div className="card">
          <h3>Pending Cargo Indents</h3>
          <div className="value">{data.indents.pending}</div>
        </div>
        <div className="card">
          <h3>Unread Alerts</h3>
          <div className="value">{data.alerts.unread}</div>
        </div>
      </div>

      {data.station && (
        <div className="panel">
          <h2>🗺️ Supply Route: Goa → Cape Town → Antarctica</h2>
          <div style={{ height: "300px", borderRadius: "12px", overflow: "hidden" }}>
            <MapContainer
              center={[-25, 45]}
              zoom={2}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <Marker position={[15.4909, 73.8278]}>
                <Popup>Goa, India — NCPOR HQ (Cargo & Team Origin)</Popup>
              </Marker>
              <Marker position={[-33.92, 18.42]}>
                <Popup>Cape Town — Ship Embarkation Port</Popup>
              </Marker>
              <Marker position={[data.station.latitude, data.station.longitude]}>
                <Popup>{data.station.name}</Popup>
              </Marker>
              <Polyline
                positions={[
                  [15.4909, 73.8278],
                  [0, 60],
                  [-33.92, 18.42],
                  [-50, 40],
                  [-60, 60],
                  [data.station.latitude, data.station.longitude]
                ]}
                color="#0ea5e9"
                dashArray="10, 5"
              />
            </MapContainer>
          </div>
        </div>
      )}

      {data.shipment && (
        <div className="panel">
          <h2>Next Shipment</h2>
          <p>Mode: {data.shipment.mode} | Origin: {data.shipment.origin} | Status: {data.shipment.status}</p>
          <p>Expected arrival: {data.shipment.expected_arrival}</p>
          <p>Current delay: {data.shipment.delay_days} days</p>
        </div>
      )}
    </div>
  );
}

// ============ INVENTORY ============

function Inventory() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/inventory")
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <h1 className="page-title">Inventory</h1>
      <p className="page-subtitle">Station stock, consumption forecast, and risk level</p>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Safety Stock</th>
                <th>Daily Use</th>
                <th>Days Remaining</th>
                <th>Stockout Date</th>
                <th>Risk</th>
                <th>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.item_id}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.current_stock} {item.unit}</td>
                  <td>{item.safety_stock} {item.unit}</td>
                  <td>{item.average_daily_consumption} {item.unit}/day</td>
                  <td>{item.days_remaining >= 999 ? "∞" : item.days_remaining}</td>
                  <td>{item.stockout_date || "-"}</td>
                  <td><RiskBadge risk={item.risk} /></td>
                  <td className="small">{item.recommended_action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ CONSUMPTION ============

function Consumption() {
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    apiFetch("/inventory").then(setItems).catch((err) => setError(err.message));
    apiFetch("/consumption").then(setRecent).catch(() => {});
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(""); setError("");
    try {
      const response = await apiFetch("/consumption", {
        method: "POST",
        body: JSON.stringify({ item_id: Number(itemId), quantity: Number(quantity), notes })
      });
      setMessage(response.message);
      setQuantity(""); setNotes("");
      apiFetch("/consumption").then(setRecent);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">Consumption Logging</h1>
      <p className="page-subtitle">Record station consumption to update stock and forecast</p>

      <div className="panel">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Item</label>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.item_id} value={item.item_id}>
                  {item.name} ({item.current_stock} {item.unit} available)
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input type="number" min="0" step="0.1" value={quantity}
              onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary">Log Consumption</button>
        </form>
      </div>

      {recent.length > 0 && (
        <div className="panel">
          <h2>Recent Consumption</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Item</th><th>Quantity</th><th>Logged At</th><th>By</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {recent.slice(0, 10).map((log) => (
                  <tr key={log.id}>
                    <td>{log.item_name}</td>
                    <td>{log.quantity}</td>
                    <td>{new Date(log.logged_at).toLocaleString()}</td>
                    <td>{log.logged_by}</td>
                    <td>{log.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ASSETS ============

function Assets() {
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/assets")
      .then(setAssets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <h1 className="page-title">Assets</h1>
      <p className="page-subtitle">Station asset status and maintenance visibility</p>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Asset</th><th>Category</th><th>Status</th><th>Location</th>
                <th>Serial Number</th><th>Last Maintenance</th><th>Next Maintenance</th><th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.name}</td>
                  <td>{asset.category}</td>
                  <td>
                    <span className={`badge ${asset.status}`}>{asset.status}</span>
                    {asset.maintenance_overdue && <div className="small error">Overdue</div>}
                  </td>
                  <td>{asset.location}</td>
                  <td>{asset.serial_number}</td>
                  <td>{asset.last_maintenance_date || "-"}</td>
                  <td>{asset.next_maintenance_date || "-"}</td>
                  <td>{asset.assigned_to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ WORK ORDERS ============

function WorkOrders() {
  const [workOrders, setWorkOrders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [description, setDescription] = useState("");
  const [spareParts, setSpareParts] = useState([{ item_id: "", quantity: 1 }]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/work-orders").then(setWorkOrders).catch(() => {});
    apiFetch("/assets").then(setAssets).catch(() => {});
    apiFetch("/inventory").then(setItems).catch(() => {});
  }, []);

  function addSparePart() {
    setSpareParts([...spareParts, { item_id: "", quantity: 1 }]);
  }

  function updateSparePart(index, field, value) {
    const updated = [...spareParts];
    updated[index][field] = field === "item_id" ? value : Number(value);
    setSpareParts(updated);
  }

  async function createWorkOrder(e) {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      await apiFetch("/work-orders", {
        method: "POST",
        body: JSON.stringify({
          asset_id: Number(selectedAsset),
          description,
          spare_parts: spareParts.filter(p => p.item_id !== "" && p.quantity > 0)
        })
      });
      setMessage("Work order created");
      setShowForm(false);
      setDescription("");
      setSpareParts([{ item_id: "", quantity: 1 }]);
      apiFetch("/work-orders").then(setWorkOrders);
    } catch (err) {
      setError(err.message);
    }
  }

  async function completeWorkOrder(wo) {
    if (!confirm(`Complete work order: ${wo.description}?`)) return;
    try {
      const parts = (wo.spare_parts_used || []).filter(p => p.item_id);
      await apiFetch(`/work-orders/${wo.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ spare_parts_used: parts })
      });
      setMessage(`Work order completed. Stock updated.`);
      apiFetch("/work-orders").then(setWorkOrders);
      apiFetch("/inventory").then(setItems);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">Work Orders</h1>
      <p className="page-subtitle">Asset maintenance with automatic spare-part deduction from inventory</p>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancel" : "+ Create Work Order"}
      </button>

      {showForm && (
        <div className="panel" style={{ marginTop: "16px" }}>
          <form onSubmit={createWorkOrder}>
            <div className="form-group">
              <label>Asset</label>
              <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)} required>
                <option value="">Select asset</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.serial_number})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows="3" value={description}
                onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Spare Parts Required (will be deducted from inventory on completion)</label>
              {spareParts.map((part, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <select value={part.item_id} onChange={(e) => updateSparePart(i, "item_id", e.target.value)}
                    style={{ flex: 2 }}>
                    <option value="">Select part</option>
                    {items.map((it) => (
                      <option key={it.item_id} value={it.item_id}>
                        {it.name} ({it.current_stock} {it.unit})
                      </option>
                    ))}
                  </select>
                  <input type="number" min="1" value={part.quantity}
                    onChange={(e) => updateSparePart(i, "quantity", e.target.value)}
                    style={{ flex: 1 }} placeholder="Qty" />
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addSparePart}>
                + Add Spare Part
              </button>
            </div>
            <button className="btn btn-primary">Create Work Order</button>
          </form>
        </div>
      )}

      <div className="panel" style={{ marginTop: "16px" }}>
        <h2>All Work Orders</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Asset</th><th>Description</th><th>Status</th>
                <th>Spare Parts</th><th>Created</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <tr key={wo.id}>
                  <td>#{wo.id}</td>
                  <td>{wo.asset_name}</td>
                  <td>{wo.description}</td>
                  <td><span className={`badge ${wo.status}`}>{wo.status}</span></td>
                  <td>
                    {(wo.spare_parts_used || []).map((p, i) => (
                      <div key={i} className="small">Item {p.item_id}: {p.quantity}</div>
                    ))}
                  </td>
                  <td>{new Date(wo.created_at).toLocaleString()}</td>
                  <td>
                    {wo.status !== "completed" && (
                      <button className="btn btn-primary" onClick={() => completeWorkOrder(wo)}>
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ INDENTS ============

function Indents() {
  const [indents, setIndents] = useState([]);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [qrToken, setQrToken] = useState("");

  const user = getUser();

  useEffect(() => {
    apiFetch("/indents").then(setIndents).catch(() => {});
    apiFetch("/inventory").then(setItems).catch(() => {});
  }, []);

  async function createIndent(e) {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      const res = await apiFetch("/indents", {
        method: "POST",
        body: JSON.stringify({ item_id: Number(selectedItem), quantity: Number(quantity), notes })
      });
      setMessage(`Indent created! QR token: ${res.qr_token}`);
      setQrToken(res.qr_token);
      setShowForm(false);
      apiFetch("/indents").then(setIndents);
    } catch (err) {
      setError(err.message);
    }
  }

  async function processIndent(indent, action) {
    setError(""); setMessage("");
    try {
      const res = await apiFetch(`/indents/${indent.id}/${action}`, { method: "POST" });
      setMessage(res.message);
      apiFetch("/indents").then(setIndents);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">Cargo Indents (eCon-Style)</h1>
      <p className="page-subtitle">
        Lifecycle: Requested → Cleared → Loaded → Received
      </p>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {(user.role === "admin" || user.role === "station_manager") && (
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Request New Cargo"}
        </button>
      )}

      {showForm && (
        <div className="panel" style={{ marginTop: "16px" }}>
          <form onSubmit={createIndent}>
            <div className="form-group">
              <label>Item</label>
              <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} required>
                <option value="">Select item</option>
                {items.map((it) => (
                  <option key={it.item_id} value={it.item_id}>
                    {it.name} ({it.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input type="number" min="1" value={quantity}
                onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <button className="btn btn-primary">Submit Indent Request</button>
          </form>
        </div>
      )}

      {qrToken && (
        <div className="panel" style={{ marginTop: "16px", textAlign: "center" }}>
          <h3>QR Code Issued</h3>
          <div style={{ background: "white", display: "inline-block", padding: "20px", borderRadius: "12px" }}>
            <QRCodeSVG value={qrToken} size={180} />
          </div>
          <p className="muted small">Token: {qrToken}</p>
        </div>
      )}

      <div className="panel" style={{ marginTop: "16px" }}>
        <h2>All Indents</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Item</th><th>Quantity</th><th>Requested By</th>
                <th>Status</th><th>Stow Position</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {indents.map((ind) => (
                <tr key={ind.id}>
                  <td>#{ind.id}</td>
                  <td>{ind.item_name}</td>
                  <td>{ind.quantity} {ind.item_unit}</td>
                  <td>{ind.requested_by}</td>
                  <td><span className={`badge ${ind.status}`}>{ind.status}</span></td>
                  <td>{ind.stow_position || "-"}</td>
                  <td>
                    {ind.status === "requested" && (user.role === "admin" || user.role === "logistics_officer") && (
                      <>
                        <button className="btn btn-primary" style={{ marginRight: "4px" }}
                          onClick={() => processIndent(ind, "clear")}>
                          Clear
                        </button>
                        <button className="btn btn-danger" onClick={() => processIndent(ind, "reject")}>
                          Reject
                        </button>
                      </>
                    )}
                    {ind.status === "cleared" && (user.role === "admin" || user.role === "station_manager") && (
                      <button className="btn btn-primary" onClick={() => processIndent(ind, "receive")}>
                        Receive Cargo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ SHIPMENTS ============

function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/shipments")
      .then(setShipments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const shipment = shipments[0];
  if (!shipment) return <div className="muted">No shipment found.</div>;

  return (
    <div>
      <h1 className="page-title">Shipments</h1>
      <p className="page-subtitle">Upcoming resupply shipment and manifest</p>

      <div className="panel">
        <h2>Shipment #{shipment.id}</h2>
        <p>Mode: {shipment.mode} | Origin: {shipment.origin} | Status: {shipment.status}</p>
        <p>Scheduled departure: {shipment.scheduled_departure}</p>
        <p>Expected arrival: {shipment.expected_arrival}</p>
        <p>Delay: {shipment.delay_days} days</p>
        <p>Capacity: {shipment.capacity_kg} kg | Volume: {shipment.capacity_volume} m³</p>
      </div>

      <div className="panel">
        <h2>Manifest (sorted by stow position)</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Stow Pos</th><th>Item</th><th>Planned Qty</th><th>Unit</th>
                <th>Weight kg</th><th>Volume m³</th>
              </tr>
            </thead>
            <tbody>
              {shipment.items.map((item) => (
                <tr key={item.shipment_item_id}>
                  <td><strong>#{item.stow_position}</strong></td>
                  <td>{item.item_name}</td>
                  <td>{item.planned_quantity}</td>
                  <td>{item.unit}</td>
                  <td>{item.weight_kg}</td>
                  <td>{item.volume_m3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ PERSONNEL ============

function Personnel() {
  const [personnel, setPersonnel] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/personnel")
      .then(setPersonnel)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <h1 className="page-title">Personnel Roster</h1>
      <p className="page-subtitle">On-station personnel, medical clearance, and assigned gear</p>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Status</th>
                <th>Medical Clearance</th><th>Days Remaining</th>
                <th>Assigned Gear</th><th>Emergency Contact</th>
              </tr>
            </thead>
            <tbody>
              {personnel.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td style={{ textTransform: "capitalize" }}>{p.role}</td>
                  <td><span className={`badge ${p.status === "on_station" ? "low" : "medium"}`}>{p.status}</span></td>
                  <td>{p.medical_clearance_expiry || "-"}</td>
                  <td>
                    {p.clearance_days_remaining !== null && (
                      <span className={p.clearance_days_remaining < 30 ? "error" : ""}>
                        {p.clearance_days_remaining} days
                      </span>
                    )}
                    {p.clearance_status === "expired" && <span className="error"> EXPIRED</span>}
                    {p.clearance_status === "expiring_soon" && <span className="error"> (soon)</span>}
                  </td>
                  <td className="small">{(p.assigned_gear || []).join(", ")}</td>
                  <td className="small">{p.emergency_contact || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ WHAT-IF SIMULATOR ============

function WhatIf() {
  const [delayDays, setDelayDays] = useState(0);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function runSimulation() {
    setLoading(true); setError("");
    try {
      const data = await apiFetch(`/forecast/what-if?delay_days=${delayDays}`);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">What-if Delay Simulator</h1>
      <p className="page-subtitle">
        Simulate resupply delay and calculate operational impact + emergency air-drop payload
      </p>

      <div className="panel">
        <div className="form-group">
          <label>Delay days</label>
          <select value={delayDays} onChange={(e) => setDelayDays(Number(e.target.value))}>
            <option value="0">No delay</option>
            <option value="15">15 days</option>
            <option value="30">30 days</option>
            <option value="45">45 days</option>
            <option value="60">60 days</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={runSimulation}>
          {loading ? "Simulating..." : "Run Simulation"}
        </button>
        {error && <div className="error">{error}</div>}
      </div>

      {report && (
        <>
          <div className="card-grid">
            <div className="card">
              <h3>Adjusted Resupply</h3>
              <div className="value">{report.adjusted_resupply_date}</div>
            </div>
            <div className="card">
              <h3>Overall Risk</h3>
              <div className="value"><RiskBadge risk={report.overall_risk} /></div>
            </div>
            <div className="card">
              <h3>Critical / High Risk Items</h3>
              <div className="value">{report.critical_items.length}</div>
            </div>
            <div className="card">
              <h3>Affected Assets</h3>
              <div className="value">{report.affected_assets}</div>
            </div>
          </div>

          <div className="panel">
            <h2>Recommended Priority Cargo</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Item</th><th>Risk</th><th>Priority Score</th>
                    <th>Recommended Qty</th><th>Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recommended_cargo.map((cargo) => (
                    <tr key={cargo.item_id}>
                      <td>{cargo.item}</td>
                      <td><RiskBadge risk={cargo.risk} /></td>
                      <td>{cargo.priority_score}</td>
                      <td>{cargo.recommended_quantity} {cargo.unit}</td>
                      <td className="small">{cargo.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {report.emergency_airdrop && report.emergency_airdrop.length > 0 && (
            <div className="panel">
              <h2>🚨 Emergency Air-Drop Payload (if delay ≥ 30 days)</h2>
              <p className="muted small">
                Calculated based on on-station personnel count for {delayDays}-day survival
              </p>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th><th>Quantity</th><th>Unit</th>
                      <th>Weight (kg)</th><th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.emergency_airdrop.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{item.weight_kg.toFixed(1)}</td>
                        <td className="small">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="panel">
            <h2>All Item Forecasts</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Item</th><th>Current Stock</th><th>Days Remaining</th>
                    <th>Stockout Date</th><th>Risk</th><th>Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.all_items.map((item) => (
                    <tr key={item.item_id}>
                      <td>{item.name}</td>
                      <td>{item.current_stock} {item.unit}</td>
                      <td>{item.days_remaining >= 999 ? "∞" : item.days_remaining}</td>
                      <td>{item.stockout_date || "-"}</td>
                      <td><RiskBadge risk={item.risk} /></td>
                      <td className="small">{item.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============ PACKING OPTIMIZER ============

function PackingOptimizer() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [capacityKg, setCapacityKg] = useState(200000);
  const [capacityVolume, setCapacityVolume] = useState(800);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch("/inventory").then((data) => {
      setItems(data);
      setSelectedItems(data.slice(0, 5).map((it) => ({
        item_id: it.item_id, quantity: 100
      })));
    }).catch(() => {});
  }, []);

  function updateSelected(index, field, value) {
    const updated = [...selectedItems];
    updated[index][field] = Number(value);
    setSelectedItems(updated);
  }

  function addSelectedItem() {
    if (items.length > 0) {
      setSelectedItems([...selectedItems, { item_id: items[0].item_id, quantity: 100 }]);
    }
  }

  async function runOptimization() {
    setLoading(true); setError("");
    try {
      const res = await apiFetch("/optimize-packing", {
        method: "POST",
        body: JSON.stringify({
          items: selectedItems,
          capacity_kg: Number(capacityKg),
          capacity_volume: Number(capacityVolume)
        })
      });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Smart Packing Optimizer (Knapsack)</h1>
      <p className="page-subtitle">
        Optimize cargo loading to maximize priority score within ship capacity limits
      </p>

      <div className="panel">
        <h2>Ship Capacity</h2>
        <div style={{ display: "flex", gap: "16px" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Capacity (kg)</label>
            <input type="number" value={capacityKg}
              onChange={(e) => setCapacityKg(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Capacity (m³)</label>
            <input type="number" value={capacityVolume}
              onChange={(e) => setCapacityVolume(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Cargo Items to Pack</h2>
        {selectedItems.map((sel, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <select value={sel.item_id} onChange={(e) => updateSelected(i, "item_id", e.target.value)}
              style={{ flex: 2 }}>
              {items.map((it) => (
                <option key={it.item_id} value={it.item_id}>{it.name}</option>
              ))}
            </select>
            <input type="number" min="1" value={sel.quantity}
              onChange={(e) => updateSelected(i, "quantity", e.target.value)}
              style={{ flex: 1 }} placeholder="Quantity" />
          </div>
        ))}
        <button className="btn btn-secondary" onClick={addSelectedItem}>+ Add Item</button>
      </div>

      <button className="btn btn-primary" onClick={runOptimization}>
        {loading ? "Optimizing..." : "🎯 Run Optimization"}
      </button>

      {error && <div className="error">{error}</div>}

      {result && (
        <>
          <div className="card-grid" style={{ marginTop: "16px" }}>
            <div className="card">
              <h3>Weight Utilization</h3>
              <div className="value">{result.utilization.weight_utilization_pct}%</div>
              <div className="muted small">
                {result.utilization.weight_used_kg.toFixed(0)} / {result.utilization.weight_capacity_kg} kg
              </div>
            </div>
            <div className="card">
              <h3>Volume Utilization</h3>
              <div className="value">{result.utilization.volume_utilization_pct}%</div>
              <div className="muted small">
                {result.utilization.volume_used_m3.toFixed(1)} / {result.utilization.volume_capacity_m3} m³
              </div>
            </div>
            <div className="card">
              <h3>Total Priority Score</h3>
              <div className="value">{result.utilization.total_priority_score}</div>
            </div>
            <div className="card">
              <h3>Items Rejected</h3>
              <div className="value">{result.items_rejected}</div>
            </div>
          </div>

          <div className="panel">
            <h2>Optimal Cargo Manifest (sorted by stow position)</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Stow</th><th>Item</th><th>Category</th><th>Quantity</th>
                    <th>Weight (kg)</th><th>Volume (m³)</th><th>Priority</th><th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {result.packed_items.map((it) => (
                    <tr key={it.item_id}>
                      <td><strong>#{it.stow_position}</strong></td>
                      <td>{it.name}</td>
                      <td>{it.category}</td>
                      <td>{it.requested_quantity} {it.unit}</td>
                      <td>{it.weight_kg.toFixed(1)}</td>
                      <td>{it.volume_m3.toFixed(2)}</td>
                      <td>{it.priority_score}</td>
                      <td><RiskBadge risk={it.risk} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============ ALERTS ============

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/alerts")
      .then(setAlerts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function markRead(alertId) {
    try {
      await apiFetch(`/alerts/${alertId}/read`, { method: "POST" });
      setAlerts((cur) => cur.map((a) => a.id === alertId ? { ...a, is_read: true } : a));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <h1 className="page-title">Alerts</h1>
      <p className="page-subtitle">Operational warnings and reminders</p>
      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Severity</th><th>Title</th><th>Message</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td><span className={`badge ${alert.severity}`}>{alert.severity}</span></td>
                  <td>{alert.title}</td>
                  <td>{alert.message}</td>
                  <td>{alert.is_read ? "Read" : "Unread"}</td>
                  <td>
                    {!alert.is_read && (
                      <button className="btn btn-secondary" onClick={() => markRead(alert.id)}>
                        Mark read
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ AUDIT TRAIL ============

function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/audit-logs")
      .then(setLogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <h1 className="page-title">Audit Trail (Admin Only)</h1>
      <p className="page-subtitle">Complete history of all system actions</p>
      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="small">{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.user_email}</td>
                  <td><strong>{log.action}</strong></td>
                  <td>{log.entity_type} #{log.entity_id}</td>
                  <td className="small">{JSON.stringify(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}