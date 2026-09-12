import { useEffect, useState } from "react";
import { apiFetch, getUser, login, logout } from "./api";
import "./style.css";

export default function App() {
  const [user, setUser] = useState(getUser());
  const [page, setPage] = useState("dashboard");
  const [notice, setNotice] = useState("");

  async function resetDemo() {
    try {
      await apiFetch("/reset", { method: "POST" });
      setNotice("Demo data reset successfully.");
      window.location.reload();
    } catch (error) {
      alert(error.message);
    }
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>PolarOps</h1>
        <div className="subtitle">
          Integrated Polar Expedition Logistics and Asset Management
        </div>

        <div className="user-box">
          <strong>{user.name}</strong>
          <small>{user.role}</small>
        </div>

        <button
          className={page === "dashboard" ? "active" : ""}
          onClick={() => setPage("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={page === "inventory" ? "active" : ""}
          onClick={() => setPage("inventory")}
        >
          Inventory
        </button>

        <button
          className={page === "consumption" ? "active" : ""}
          onClick={() => setPage("consumption")}
        >
          Consumption
        </button>

        <button
          className={page === "assets" ? "active" : ""}
          onClick={() => setPage("assets")}
        >
          Assets
        </button>

        <button
          className={page === "shipments" ? "active" : ""}
          onClick={() => setPage("shipments")}
        >
          Shipments
        </button>

        <button
          className={page === "whatif" ? "active" : ""}
          onClick={() => setPage("whatif")}
        >
          What-if Simulator
        </button>

        <button
          className={page === "alerts" ? "active" : ""}
          onClick={() => setPage("alerts")}
        >
          Alerts
        </button>

        <button className="danger" onClick={resetDemo}>
          Reset Demo Data
        </button>

        <button
          onClick={() => {
            logout();
            setUser(null);
          }}
        >
          Logout
        </button>
      </aside>

      <main className="main">
        {notice && <div className="notice">{notice}</div>}

        {page === "dashboard" && <Dashboard />}
        {page === "inventory" && <Inventory />}
        {page === "consumption" && <Consumption />}
        {page === "assets" && <Assets />}
        {page === "shipments" && <Shipments />}
        {page === "whatif" && <WhatIf />}
        {page === "alerts" && <Alerts />}
      </main>
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@polarops.demo");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const quickUsers = [
    {
      label: "Admin / Expedition Planner",
      email: "admin@polarops.demo",
      password: "admin123"
    },
    {
      label: "Station Manager",
      email: "station@polarops.demo",
      password: "station123"
    },
    {
      label: "Logistics Officer",
      email: "logistics@polarops.demo",
      password: "logistics123"
    }
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
        <h1>PolarOps</h1>
        <p>
          Integrated Polar Expedition Logistics and Asset Management Prototype
        </p>

        <div className="quick-users">
          {quickUsers.map((quickUser) => (
            <button
              key={quickUser.email}
              onClick={() => {
                setEmail(quickUser.email);
                setPassword(quickUser.password);
              }}
            >
              {quickUser.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
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

function Loading() {
  return <div className="muted">Loading...</div>;
}

function ErrorBox({ message }) {
  return <div className="error">{message}</div>;
}

function RiskBadge({ risk }) {
  return <span className={`badge ${risk}`}>{risk}</span>;
}

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
      <p className="page-subtitle">
        Operational overview for {data.station.name}
      </p>

      <div className="card-grid">
        <div className="card">
          <h3>Station</h3>
          <div className="value">{data.station.name}</div>
          <div className="muted small">
            Next resupply: {data.station.next_resupply_date}
          </div>
        </div>

        <div className="card">
          <h3>Overall Risk</h3>
          <div className="value">
            <RiskBadge risk={data.overall_risk} />
          </div>
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
          <div className="muted small">
            Maintenance due: {data.assets.maintenance_due}
          </div>
        </div>

        <div className="card">
          <h3>Unread Alerts</h3>
          <div className="value">{data.alerts.unread}</div>
          <div className="muted small">
            High severity: {data.alerts.high_severity}
          </div>
        </div>
      </div>

      {data.shipment && (
        <div className="panel">
          <h2>Next Shipment</h2>
          <p>
            Mode: {data.shipment.mode} | Origin: {data.shipment.origin} |
            Status: {data.shipment.status}
          </p>
          <p>
            Expected arrival: {data.shipment.expected_arrival}
          </p>
          <p>
            Current delay: {data.shipment.delay_days} days
          </p>
        </div>
      )}
    </div>
  );
}

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
      <p className="page-subtitle">
        Station stock, consumption forecast, and risk level
      </p>

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
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.item_id}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>
                    {item.current_stock} {item.unit}
                  </td>
                  <td>
                    {item.safety_stock} {item.unit}
                  </td>
                  <td>
                    {item.average_daily_consumption} {item.unit}/day
                  </td>
                  <td>
                    {item.days_remaining >= 999 ? "∞" : item.days_remaining}
                  </td>
                  <td>{item.stockout_date || "-"}</td>
                  <td>
                    <RiskBadge risk={item.risk} />
                  </td>
                  <td>{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Consumption() {
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/inventory")
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await apiFetch("/consumption", {
        method: "POST",
        body: JSON.stringify({
          item_id: Number(itemId),
          quantity: Number(quantity),
          notes
        })
      });

      setMessage(response.message);
      setQuantity("");
      setNotes("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">Consumption Logging</h1>
      <p className="page-subtitle">
        Record station consumption to update stock and forecast
      </p>

      <div className="panel">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Item</label>
            <select
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
            >
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
            <input
              type="number"
              min="0"
              step="0.1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              rows="3"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}

          <button className="btn btn-primary">Log Consumption</button>
        </form>
      </div>
    </div>
  );
}

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
      <p className="page-subtitle">
        Station asset status and maintenance visibility
      </p>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Category</th>
                <th>Status</th>
                <th>Location</th>
                <th>Serial Number</th>
                <th>Last Maintenance</th>
                <th>Next Maintenance</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.name}</td>
                  <td>{asset.category}</td>
                  <td>
                    <span className={`badge ${asset.status}`}>
                      {asset.status}
                    </span>
                    {asset.maintenance_overdue && (
                      <div className="small error">Overdue</div>
                    )}
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

  if (!shipment) {
    return <div className="muted">No shipment found.</div>;
  }

  return (
    <div>
      <h1 className="page-title">Shipments</h1>
      <p className="page-subtitle">Upcoming resupply shipment and manifest</p>

      <div className="panel">
        <h2>Shipment #{shipment.id}</h2>
        <p>
          Mode: {shipment.mode} | Origin: {shipment.origin} | Status:{" "}
          {shipment.status}
        </p>
        <p>
          Scheduled departure: {shipment.scheduled_departure}
        </p>
        <p>
          Expected arrival: {shipment.expected_arrival}
        </p>
        <p>
          Delay: {shipment.delay_days} days
        </p>
        <p>
          Capacity: {shipment.capacity_kg} kg | Volume:{" "}
          {shipment.capacity_volume} m³
        </p>
      </div>

      <div className="panel">
        <h2>Manifest</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Planned Quantity</th>
                <th>Unit</th>
                <th>Weight kg</th>
                <th>Volume m³</th>
              </tr>
            </thead>
            <tbody>
              {shipment.items.map((item) => (
                <tr key={item.shipment_item_id}>
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

function WhatIf() {
  const [delayDays, setDelayDays] = useState(0);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function runSimulation() {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch(
        `/forecast/what-if?delay_days=${delayDays}`
      );
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
        Simulate resupply delay and calculate operational impact
      </p>

      <div className="panel">
        <div className="form-group">
          <label>Delay days</label>
          <select
            value={delayDays}
            onChange={(event) => setDelayDays(Number(event.target.value))}
          >
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
              <div className="value">
                <RiskBadge risk={report.overall_risk} />
              </div>
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
                    <th>Item</th>
                    <th>Risk</th>
                    <th>Priority Score</th>
                    <th>Recommended Quantity</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recommended_cargo.map((cargo) => (
                    <tr key={cargo.item_id}>
                      <td>{cargo.item}</td>
                      <td>
                        <RiskBadge risk={cargo.risk} />
                      </td>
                      <td>{cargo.priority_score}</td>
                      <td>
                        {cargo.recommended_quantity} {cargo.unit}
                      </td>
                      <td>{cargo.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2>All Item Forecasts</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Current Stock</th>
                    <th>Days Remaining</th>
                    <th>Stockout Date</th>
                    <th>Risk</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {report.all_items.map((item) => (
                    <tr key={item.item_id}>
                      <td>{item.name}</td>
                      <td>
                        {item.current_stock} {item.unit}
                      </td>
                      <td>
                        {item.days_remaining >= 999 ? "∞" : item.days_remaining}
                      </td>
                      <td>{item.stockout_date || "-"}</td>
                      <td>
                        <RiskBadge risk={item.risk} />
                      </td>
                      <td>{item.reason}</td>
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
      await apiFetch(`/alerts/${alertId}/read`, {
        method: "POST"
      });

      setAlerts((currentAlerts) =>
        currentAlerts.map((alert) =>
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
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
              <tr>
                <th>Severity</th>
                <th>Title</th>
                <th>Message</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>
                    <span className={`badge ${alert.severity}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td>{alert.title}</td>
                  <td>{alert.message}</td>
                  <td>{alert.is_read ? "Read" : "Unread"}</td>
                  <td>
                    {!alert.is_read && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => markRead(alert.id)}
                      >
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