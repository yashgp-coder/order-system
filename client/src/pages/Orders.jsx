import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { orderAPI } from "../services/api";
import { useSocket } from "../context/SocketContext";

const STATUS_CONFIG = {
  "Placed":           { color: "var(--status-placed)",    bg: "rgba(74,144,229,0.12)",  icon: "📋", label: "Placed"           },
  "Preparing":        { color: "var(--status-preparing)", bg: "rgba(245,200,66,0.12)", icon: "👨‍🍳", label: "Preparing"        },
  "Out for Delivery": { color: "var(--status-delivery)",  bg: "rgba(255,107,53,0.12)", icon: "🛵", label: "Out for Delivery" },
  "Delivered":        { color: "var(--status-delivered)", bg: "rgba(76,175,130,0.12)", icon: "✅", label: "Delivered"        },
  "Cancelled":        { color: "var(--status-cancelled)", bg: "rgba(229,80,74,0.12)",  icon: "❌", label: "Cancelled"        },
};

const FILTERS = ["All", "Active", "Delivered", "Cancelled"];

export default function Orders() {
  const { on } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getMyOrders();
      setOrders(data.orders);
    } catch {
      // fail silently — empty state handles it
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // ── Real-time status updates via socket ──────────────────────────────────
  useEffect(() => {
    const cleanup = on("order:statusUpdated", ({ order }) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, status: order.status } : o))
      );
    });
    return cleanup;
  }, [on]);

  // ── Filter logic ──────────────────────────────────────────────────────────
  const ACTIVE_STATUSES = ["Placed", "Preparing", "Out for Delivery"];
  const filteredOrders = orders.filter((o) => {
    if (filter === "All")       return true;
    if (filter === "Active")    return ACTIVE_STATUSES.includes(o.status);
    if (filter === "Delivered") return o.status === "Delivered";
    if (filter === "Cancelled") return o.status === "Cancelled";
    return true;
  });

  // ── Summary counts ────────────────────────────────────────────────────────
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Orders</h1>
            <p style={styles.subtitle}>
              {orders.length} total order{orders.length !== 1 ? "s" : ""}
              {activeCount > 0 && <span style={styles.activeBadge}>{activeCount} active</span>}
            </p>
          </div>
          <Link to="/menu" style={styles.orderBtn}>+ New Order</Link>
        </div>

        {/* Filter tabs */}
        <div style={styles.filterRow}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ ...styles.filterTab, ...(filter === f ? styles.filterTabActive : {}) }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={styles.grid}>
            {[...Array(3)].map((_, i) => <OrderSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredOrders.length === 0 && (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>📋</span>
            <h3 style={styles.emptyTitle}>
              {filter === "All" ? "No orders yet" : `No ${filter.toLowerCase()} orders`}
            </h3>
            <p style={styles.emptyText}>
              {filter === "All" ? "Place your first order and it'll appear here." : ""}
            </p>
            {filter === "All" && <Link to="/menu" style={styles.browseBtn}>Browse Menu →</Link>}
          </div>
        )}

        {/* Orders list */}
        {!loading && filteredOrders.length > 0 && (
          <div style={styles.list}>
            {filteredOrders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["Placed"];
  const date = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const itemSummary = order.items
    .slice(0, 3)
    .map((i) => `${i.name} ×${i.quantity}`)
    .join(", ");
  const extra = order.items.length > 3 ? ` +${order.items.length - 3} more` : "";

  return (
    <Link to={`/orders/${order._id}`} style={cardStyles.card}>
      {/* Top row */}
      <div style={cardStyles.topRow}>
        <div style={cardStyles.idBlock}>
          <p style={cardStyles.orderLabel}>Order</p>
          <p style={cardStyles.orderId}>#{order._id.slice(-6).toUpperCase()}</p>
        </div>

        <span style={{ ...cardStyles.statusBadge, color: cfg.color, background: cfg.bg }}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Items summary */}
      <p style={cardStyles.itemsSummary}>{itemSummary}{extra}</p>

      {/* Bottom row */}
      <div style={cardStyles.bottomRow}>
        <span style={cardStyles.date}>{date}</span>
        <span style={cardStyles.total}>${(order.totalAmount + 2.99).toFixed(2)}</span>
      </div>

      {/* Active order progress indicator */}
      {["Placed", "Preparing", "Out for Delivery"].includes(order.status) && (
        <div style={cardStyles.progressWrap}>
          {["Placed", "Preparing", "Out for Delivery", "Delivered"].map((s, i) => {
            const STEPS = ["Placed", "Preparing", "Out for Delivery", "Delivered"];
            const currentIdx = STEPS.indexOf(order.status);
            const isComplete = i <= currentIdx;
            return (
              <div key={s} style={cardStyles.progressStep}>
                <div style={{
                  ...cardStyles.progressDot,
                  background: isComplete ? "var(--color-primary)" : "var(--color-border)",
                  boxShadow: isComplete ? "0 0 8px rgba(255,107,53,0.4)" : "none",
                }} />
                {i < 3 && (
                  <div style={{
                    ...cardStyles.progressLine,
                    background: i < currentIdx ? "var(--color-primary)" : "var(--color-border)",
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={cardStyles.viewLink}>Track order →</div>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div style={{ ...cardStyles.card, pointerEvents: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <div className="skeleton" style={{ height: "36px", width: "80px", borderRadius: "6px" }} />
        <div className="skeleton" style={{ height: "26px", width: "120px", borderRadius: "20px" }} />
      </div>
      <div className="skeleton" style={{ height: "14px", width: "70%", borderRadius: "4px", marginBottom: "16px" }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div className="skeleton" style={{ height: "13px", width: "120px", borderRadius: "4px" }} />
        <div className="skeleton" style={{ height: "13px", width: "60px", borderRadius: "4px" }} />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: "calc(100vh - 64px)", background: "var(--color-bg)", padding: "32px 0 80px" },
  container: { maxWidth: "800px", margin: "0 auto", padding: "0 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" },
  title: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem", color: "var(--color-text-primary)", marginBottom: "6px" },
  subtitle: { color: "var(--color-text-muted)", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "10px" },
  activeBadge: { background: "rgba(255,107,53,0.15)", color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: 700, padding: "2px 10px", borderRadius: "var(--radius-full)" },
  orderBtn: { padding: "10px 20px", background: "var(--color-primary)", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 700, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: "0.875rem", flexShrink: 0 },
  filterRow: { display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" },
  filterTab: { padding: "7px 18px", borderRadius: "var(--radius-full)", background: "var(--color-bg-elevated)", border: "1.5px solid var(--color-border)", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.875rem", transition: "all 150ms ease" },
  filterTabActive: { background: "rgba(255,107,53,0.12)", borderColor: "var(--color-primary)", color: "var(--color-primary)" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  grid: { display: "flex", flexDirection: "column", gap: "12px" },
  empty: { textAlign: "center", padding: "80px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" },
  emptyIcon: { fontSize: "3.5rem" },
  emptyTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--color-text-primary)" },
  emptyText: { color: "var(--color-text-muted)", fontSize: "0.9rem" },
  browseBtn: { padding: "10px 24px", marginTop: "8px", background: "var(--color-primary)", color: "#fff", borderRadius: "var(--radius-md)", textDecoration: "none", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "0.9rem" },
};

const cardStyles = {
  card: { display: "block", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px 24px", textDecoration: "none", transition: "border-color 200ms ease, box-shadow 200ms ease", cursor: "pointer", animation: "fadeIn 0.3s ease forwards" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" },
  idBlock: {},
  orderLabel: { color: "var(--color-text-muted)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" },
  orderId: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text-primary)" },
  statusBadge: { padding: "5px 12px", borderRadius: "var(--radius-full)", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" },
  itemsSummary: { color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  bottomRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0" },
  date: { color: "var(--color-text-muted)", fontSize: "0.78rem" },
  total: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" },
  progressWrap: { display: "flex", alignItems: "center", margin: "16px 0 4px", padding: "12px 16px", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)" },
  progressStep: { display: "flex", alignItems: "center", flex: 1 },
  progressDot: { width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0, transition: "all 300ms ease" },
  progressLine: { flex: 1, height: "2px", transition: "background 300ms ease" },
  viewLink: { marginTop: "12px", color: "var(--color-primary)", fontSize: "0.8rem", fontWeight: 600, textAlign: "right" },
};
