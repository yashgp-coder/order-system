import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { adminAPI } from "../services/api";
import { useQueueUpdates, useNewOrders } from "../hooks/useOrderStatus";
import toast from "react-hot-toast";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  "Placed":           { color: "var(--status-placed)",    bg: "rgba(74,144,229,0.12)",  icon: "📋" },
  "Preparing":        { color: "var(--status-preparing)", bg: "rgba(245,200,66,0.12)", icon: "👨‍🍳" },
  "Out for Delivery": { color: "var(--status-delivery)",  bg: "rgba(255,107,53,0.12)", icon: "🛵" },
  "Delivered":        { color: "var(--status-delivered)", bg: "rgba(76,175,130,0.12)", icon: "✅" },
  "Cancelled":        { color: "var(--status-cancelled)", bg: "rgba(229,80,74,0.12)",  icon: "❌" },
};

const NEXT_STATUS = {
  "Placed":           "Preparing",
  "Preparing":        "Out for Delivery",
  "Out for Delivery": "Delivered",
};

const STATUS_FILTERS = ["all", "Placed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab]           = useState("orders"); // orders | queue | stats
  const [stats, setStats]       = useState(null);
  const [orders, setOrders]     = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingStats, setLoadingStats]   = useState(true);
  const [updatingId, setUpdatingId]       = useState(null);
  const [newOrderIds, setNewOrderIds]     = useState(new Set()); // highlight new arrivals

  // ── Live queue via hook ────────────────────────────────────────────────────
  const { queue, lastUpdated: queueUpdated } = useQueueUpdates([]);

  // ── New order alerts ───────────────────────────────────────────────────────
  useNewOrders(useCallback((order) => {
    setNewOrderIds((prev) => new Set([...prev, order._id]));
    // Refresh order list to include the new order
    fetchOrders();
    // Clear highlight after 10s
    setTimeout(() => {
      setNewOrderIds((prev) => { const s = new Set(prev); s.delete(order._id); return s; });
    }, 10000);
  }, []));

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { data } = await adminAPI.getStats();
      setStats(data.stats);
    } catch { /* fail silently */ }
    finally { setLoadingStats(false); }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const { data } = await adminAPI.getAllOrders(params);
      setOrders(data.orders);
    } catch { /* fail silently */ }
    finally { setLoadingOrders(false); }
  }, [statusFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus);
      // Optimistically update local state
      setOrders((prev) =>
        prev.map((o) => o._id === orderId ? { ...o, status: newStatus } : o)
      );
      toast.success(`Order updated → ${newStatus}`);
      // Refresh stats counts
      fetchStats();
    } catch (err) {
      toast.error(err?.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Auto-refresh every 30s when on orders tab ──────────────────────────────
  useEffect(() => {
    if (tab !== "orders") return;
    const t = setInterval(fetchOrders, 30000);
    return () => clearInterval(t);
  }, [tab, fetchOrders]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>Manage orders and monitor kitchen activity</p>
          </div>
          <button onClick={() => { fetchOrders(); fetchStats(); }} style={styles.refreshBtn}>
            🔄 Refresh
          </button>
        </div>

        {/* ── Stats Cards ─────────────────────────────────────────────────── */}
        <div style={styles.statsGrid}>
          <StatCard
            loading={loadingStats}
            icon="📦" label="Today's Orders"
            value={stats?.todayOrders ?? "—"}
            accent="var(--color-primary)"
          />
          <StatCard
            loading={loadingStats}
            icon="💰" label="Today's Revenue"
            value={stats ? `$${stats.todayRevenue.toFixed(2)}` : "—"}
            accent="var(--color-success)"
          />
          <StatCard
            loading={loadingStats}
            icon="🔥" label="Active Orders"
            value={stats?.activeOrders ?? "—"}
            accent="var(--color-warning)"
            pulse={stats?.activeOrders > 0}
          />
          <StatCard
            loading={loadingStats}
            icon="🍽️" label="All-Time Orders"
            value={stats?.allTimeOrders ?? "—"}
            accent="var(--color-text-muted)"
          />
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div style={styles.tabBar}>
          {[
            { id: "orders", label: "📋 All Orders" },
            { id: "queue",  label: `👨‍🍳 Kitchen Queue ${queue.length > 0 ? `(${queue.length})` : ""}` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Orders Tab ──────────────────────────────────────────────────── */}
        {tab === "orders" && (
          <>
            {/* Status filter pills */}
            <div style={styles.filterRow}>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{
                    ...styles.filterPill,
                    ...(statusFilter === f ? styles.filterPillActive : {}),
                  }}
                >
                  {f === "all" ? "All" : `${STATUS_CONFIG[f]?.icon} ${f}`}
                </button>
              ))}
            </div>

            {loadingOrders ? (
              <div style={styles.tableWrap}>
                {[...Array(5)].map((_, i) => <OrderRowSkeleton key={i} />)}
              </div>
            ) : orders.length === 0 ? (
              <div style={styles.empty}>
                <span style={styles.emptyIcon}>📭</span>
                <p style={styles.emptyText}>No orders found for this filter.</p>
              </div>
            ) : (
              <div style={styles.tableWrap}>
                {/* Table header */}
                <div style={styles.tableHeader}>
                  <span style={styles.thOrder}>Order</span>
                  <span style={styles.thCustomer}>Customer</span>
                  <span style={styles.thItems}>Items</span>
                  <span style={styles.thTotal}>Total</span>
                  <span style={styles.thStatus}>Status</span>
                  <span style={styles.thActions}>Action</span>
                </div>

                {orders.map((order) => (
                  <OrderRow
                    key={order._id}
                    order={order}
                    isNew={newOrderIds.has(order._id)}
                    updating={updatingId === order._id}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Kitchen Queue Tab ────────────────────────────────────────────── */}
        {tab === "queue" && (
          <QueuePanel queue={queue} lastUpdated={queueUpdated} onStatusUpdate={handleStatusUpdate} updatingId={updatingId} />
        )}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent, pulse, loading }) {
  return (
    <div style={{ ...cardStyles.card, borderColor: accent + "33" }}>
      <div style={cardStyles.top}>
        <span style={cardStyles.icon}>{icon}</span>
        {pulse && <span style={cardStyles.pulseDot} />}
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: "36px", width: "80px", borderRadius: "6px", marginBottom: "8px" }} />
      ) : (
        <p style={{ ...cardStyles.value, color: accent }}>{value}</p>
      )}
      <p style={cardStyles.label}>{label}</p>
    </div>
  );
}

// ── Order Row ─────────────────────────────────────────────────────────────────
function OrderRow({ order, isNew, updating, onStatusUpdate }) {
  const cfg      = STATUS_CONFIG[order.status] || STATUS_CONFIG["Placed"];
  const nextStat = NEXT_STATUS[order.status];
  const canCancel = order.status === "Placed" || order.status === "Preparing";
  const date      = new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const itemSummary = order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ");

  return (
    <div style={{
      ...rowStyles.row,
      ...(isNew ? rowStyles.rowNew : {}),
      opacity: updating ? 0.6 : 1,
      transition: "opacity 200ms ease, background 600ms ease",
    }}>
      {/* Order ID + time */}
      <div style={rowStyles.cell}>
        <Link to={`/orders/${order._id}`} style={rowStyles.orderId}>
          #{order._id.slice(-6).toUpperCase()}
        </Link>
        <span style={rowStyles.time}>{date}</span>
        {isNew && <span style={rowStyles.newBadge}>NEW</span>}
      </div>

      {/* Customer */}
      <div style={rowStyles.cell}>
        <span style={rowStyles.customer}>{order.user?.name || "Unknown"}</span>
        <span style={rowStyles.email}>{order.user?.email}</span>
      </div>

      {/* Items */}
      <div style={{ ...rowStyles.cell, ...rowStyles.itemsCell }}>
        <span style={rowStyles.items} title={itemSummary}>{itemSummary}</span>
      </div>

      {/* Total */}
      <div style={rowStyles.cell}>
        <span style={rowStyles.total}>${(order.totalAmount + 2.99).toFixed(2)}</span>
      </div>

      {/* Status badge */}
      <div style={rowStyles.cell}>
        <span style={{ ...rowStyles.statusBadge, color: cfg.color, background: cfg.bg }}>
          {cfg.icon} {order.status}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ ...rowStyles.cell, ...rowStyles.actionsCell }}>
        {nextStat && (
          <button
            onClick={() => onStatusUpdate(order._id, nextStat)}
            disabled={updating}
            style={rowStyles.advanceBtn}
            title={`Advance to ${nextStat}`}
          >
            {updating ? "..." : `→ ${nextStat}`}
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => onStatusUpdate(order._id, "Cancelled")}
            disabled={updating}
            style={rowStyles.cancelBtn}
            title="Cancel order"
          >
            ✕
          </button>
        )}
        {!nextStat && !canCancel && (
          <span style={rowStyles.terminalLabel}>
            {order.status === "Delivered" ? "✅ Done" : "❌ Void"}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Order Row Skeleton ────────────────────────────────────────────────────────
function OrderRowSkeleton() {
  return (
    <div style={{ ...rowStyles.row, gap: "12px" }}>
      {[70, 100, 180, 60, 90, 80].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: "20px", width: `${w}px`, borderRadius: "4px", flexShrink: 0 }} />
      ))}
    </div>
  );
}

// ── Kitchen Queue Panel ───────────────────────────────────────────────────────
function QueuePanel({ queue, lastUpdated, onStatusUpdate, updatingId }) {
  return (
    <div style={queueStyles.panel}>
      {/* Header */}
      <div style={queueStyles.header}>
        <div>
          <h2 style={queueStyles.title}>Kitchen Queue</h2>
          <p style={queueStyles.subtitle}>
            {queue.length === 0
              ? "No orders currently preparing"
              : `${queue.length} order${queue.length !== 1 ? "s" : ""} in preparation`}
          </p>
        </div>
        {lastUpdated && (
          <span style={queueStyles.updatedAt}>
            🔴 Live · updated {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      {queue.length === 0 ? (
        <div style={queueStyles.empty}>
          <span style={{ fontSize: "3rem" }}>👨‍🍳</span>
          <p style={queueStyles.emptyTitle}>Kitchen is idle</p>
          <p style={queueStyles.emptyText}>Advance a "Placed" order to "Preparing" to see it here.</p>
        </div>
      ) : (
        <div style={queueStyles.cards}>
          {queue.map((entry) => (
            <QueueCard
              key={entry._id}
              entry={entry}
              updating={updatingId === entry._id}
              onAdvance={() => onStatusUpdate(entry._id, "Out for Delivery")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Queue Card ────────────────────────────────────────────────────────────────
function QueueCard({ entry, updating, onAdvance }) {
  const waitMs  = Date.now() - new Date(entry.createdAt).getTime();
  const waitMin = Math.floor(waitMs / 60000);

  return (
    <div style={queueCardStyles.card}>
      {/* Position badge */}
      <div style={queueCardStyles.positionBadge}>
        #{entry.position}
      </div>

      {/* Info */}
      <div style={queueCardStyles.info}>
        <p style={queueCardStyles.orderId}>#{String(entry._id).slice(-6).toUpperCase()}</p>
        <p style={queueCardStyles.customer}>{entry.user}</p>
        <div style={queueCardStyles.metaRow}>
          <span style={queueCardStyles.metaPill}>🍽️ {entry.itemCount} item{entry.itemCount !== 1 ? "s" : ""}</span>
          <span style={queueCardStyles.metaPill}>⏱ ~{entry.estimatedTime}m</span>
          <span style={{ ...queueCardStyles.metaPill, color: waitMin > 10 ? "var(--color-error)" : "var(--color-text-muted)" }}>
            🕐 {waitMin}m waiting
          </span>
        </div>
      </div>

      {/* Advance button */}
      <button
        onClick={onAdvance}
        disabled={updating}
        style={queueCardStyles.advanceBtn}
      >
        {updating ? (
          <span style={queueCardStyles.spinner} />
        ) : (
          <>🛵 Ready for Delivery</>
        )}
      </button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: "calc(100vh - 64px)", background: "var(--color-bg)", padding: "32px 0 80px" },
  container: { maxWidth: "1300px", margin: "0 auto", padding: "0 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" },
  title: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem", color: "var(--color-text-primary)", marginBottom: "6px" },
  subtitle: { color: "var(--color-text-muted)", fontSize: "0.95rem" },
  refreshBtn: { padding: "9px 18px", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 500, transition: "all 150ms ease" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "28px" },
  tabBar: { display: "flex", gap: "4px", marginBottom: "20px", background: "var(--color-bg-elevated)", padding: "4px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", width: "fit-content" },
  tab: { padding: "9px 20px", borderRadius: "var(--radius-md)", background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.875rem", transition: "all 150ms ease", whiteSpace: "nowrap" },
  tabActive: { background: "var(--color-bg-card)", color: "var(--color-text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" },
  filterRow: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
  filterPill: { padding: "6px 14px", borderRadius: "var(--radius-full)", background: "var(--color-bg-elevated)", border: "1.5px solid var(--color-border)", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.8rem", transition: "all 150ms ease", whiteSpace: "nowrap" },
  filterPillActive: { background: "rgba(255,107,53,0.12)", borderColor: "var(--color-primary)", color: "var(--color-primary)" },
  tableWrap: { background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
  tableHeader: { display: "grid", gridTemplateColumns: "130px 160px 1fr 90px 160px 160px", gap: "12px", padding: "12px 20px", background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border)" },
  thOrder:    { color: "var(--color-text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
  thCustomer: { color: "var(--color-text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
  thItems:    { color: "var(--color-text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
  thTotal:    { color: "var(--color-text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
  thStatus:   { color: "var(--color-text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
  thActions:  { color: "var(--color-text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
  empty: { textAlign: "center", padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  emptyIcon: { fontSize: "3rem" },
  emptyText: { color: "var(--color-text-muted)", fontSize: "0.9rem" },
};

const cardStyles = {
  card: { background: "var(--color-bg-card)", border: "1.5px solid", borderRadius: "var(--radius-lg)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "4px", transition: "border-color 300ms ease" },
  top: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  icon: { fontSize: "1.5rem" },
  pulseDot: { width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-warning)", animation: "pulse 1.5s ease infinite" },
  value: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem", lineHeight: 1 },
  label: { color: "var(--color-text-muted)", fontSize: "0.8rem", fontWeight: 500, marginTop: "4px" },
};

const rowStyles = {
  row: { display: "grid", gridTemplateColumns: "130px 160px 1fr 90px 160px 160px", gap: "12px", padding: "14px 20px", borderBottom: "1px solid var(--color-border-subtle)", alignItems: "center" },
  rowNew: { background: "rgba(76,175,130,0.06)", animation: "fadeIn 0.5s ease" },
  cell: { display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 },
  orderId: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.875rem", color: "var(--color-primary)", textDecoration: "none" },
  time: { color: "var(--color-text-muted)", fontSize: "0.72rem" },
  newBadge: { display: "inline-block", background: "rgba(76,175,130,0.2)", color: "var(--color-success)", fontSize: "0.65rem", fontWeight: 800, padding: "1px 6px", borderRadius: "var(--radius-full)", letterSpacing: "0.06em", width: "fit-content" },
  customer: { color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  email: { color: "var(--color-text-muted)", fontSize: "0.72rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemsCell: { overflow: "hidden" },
  items: { color: "var(--color-text-secondary)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  total: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "var(--color-text-primary)" },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600, width: "fit-content", whiteSpace: "nowrap" },
  actionsCell: { flexDirection: "row", gap: "8px", flexWrap: "wrap" },
  advanceBtn: { padding: "6px 12px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.75rem", transition: "all 150ms ease", whiteSpace: "nowrap" },
  cancelBtn: { padding: "6px 10px", background: "transparent", color: "var(--color-error)", border: "1px solid var(--color-error)", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", transition: "all 150ms ease" },
  terminalLabel: { color: "var(--color-text-muted)", fontSize: "0.78rem" },
};

const queueStyles = {
  panel: { background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", borderBottom: "1px solid var(--color-border)", flexWrap: "wrap", gap: "12px" },
  title: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text-primary)", marginBottom: "4px" },
  subtitle: { color: "var(--color-text-muted)", fontSize: "0.875rem" },
  updatedAt: { color: "var(--color-error)", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" },
  empty: { padding: "60px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  emptyTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text-primary)" },
  emptyText: { color: "var(--color-text-muted)", fontSize: "0.875rem" },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px", padding: "20px 24px" },
};

const queueCardStyles = {
  card: { background: "var(--color-bg-elevated)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", transition: "border-color 300ms ease", animation: "fadeIn 0.3s ease" },
  positionBadge: { width: "40px", height: "40px", borderRadius: "50%", background: "rgba(245,200,66,0.15)", border: "2px solid rgba(245,200,66,0.4)", color: "var(--color-warning)", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  orderId: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)", marginBottom: "4px" },
  customer: { color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "10px" },
  metaRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
  metaPill: { padding: "3px 10px", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-full)", fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500 },
  advanceBtn: { width: "100%", padding: "11px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", transition: "all 150ms ease", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
  spinner: { width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" },
};
