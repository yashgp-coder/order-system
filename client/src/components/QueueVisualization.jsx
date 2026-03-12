import { useState, useEffect, useRef, useCallback } from "react";
import { adminAPI } from "../services/api";
import { useSocket } from "../context/SocketContext";
import { useNewOrders } from "../hooks/useOrderStatus";

// ── Pipeline columns ──────────────────────────────────────────────────────────
const PIPELINE = [
  {
    status: "Placed",
    label:  "Order Placed",
    icon:   "📋",
    color:  "#4A90E5",
    bg:     "rgba(74,144,229,0.08)",
    border: "rgba(74,144,229,0.25)",
  },
  {
    status: "Preparing",
    label:  "Preparing",
    icon:   "👨‍🍳",
    color:  "#F5C842",
    bg:     "rgba(245,200,66,0.08)",
    border: "rgba(245,200,66,0.25)",
  },
  {
    status: "Out for Delivery",
    label:  "Out for Delivery",
    icon:   "🛵",
    color:  "#FF6B35",
    bg:     "rgba(255,107,53,0.08)",
    border: "rgba(255,107,53,0.25)",
  },
  {
    status: "Delivered",
    label:  "Delivered",
    icon:   "✅",
    color:  "#4CAF82",
    bg:     "rgba(76,175,130,0.08)",
    border: "rgba(76,175,130,0.25)",
  },
];

const NEXT_STATUS = {
  "Placed":           "Preparing",
  "Preparing":        "Out for Delivery",
  "Out for Delivery": "Delivered",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function QueueVisualization() {
  const { on } = useSocket();

  const [orders, setOrders]         = useState({
    Placed: [], Preparing: [], "Out for Delivery": [], Delivered: [],
  });
  const [loading, setLoading]       = useState(true);
  const [movingIds, setMovingIds]   = useState(new Set()); // cards mid-transition
  const [newIds, setNewIds]         = useState(new Set()); // freshly arrived
  const [updatingId, setUpdatingId] = useState(null);
  const [throughput, setThroughput] = useState([]); // last 8 delivered timestamps

  // ── Fetch all active orders on mount ────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await adminAPI.getAllOrders({ limit: 100 });
      const grouped = { Placed: [], Preparing: [], "Out for Delivery": [], Delivered: [] };
      data.orders.forEach((o) => {
        if (grouped[o.status]) grouped[o.status].unshift(o);
      });
      // Only keep last 10 in Delivered column
      grouped.Delivered = grouped.Delivered.slice(0, 10);
      setOrders(grouped);
    } catch { /* fail silently */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Real-time: status updated ────────────────────────────────────────────
  useEffect(() => {
    const cleanup = on("order:statusUpdated", ({ order }) => {
      setMovingIds((prev) => new Set([...prev, order._id]));

      setTimeout(() => {
        setOrders((prev) => {
          const next = { ...prev };
          // Remove from all columns
          Object.keys(next).forEach((col) => {
            next[col] = next[col].filter((o) => o._id !== order._id);
          });
          // Add to new column
          if (next[order.status]) {
            next[order.status] = [order, ...next[order.status]];
            // Cap Delivered at 10
            if (order.status === "Delivered") {
              next[order.status] = next[order.status].slice(0, 10);
              // Track throughput
              setThroughput((prev) => [...prev.slice(-7), new Date()]);
            }
          }
          return next;
        });

        setMovingIds((prev) => { const s = new Set(prev); s.delete(order._id); return s; });
        setNewIds((prev) => new Set([...prev, order._id]));
        setTimeout(() => {
          setNewIds((prev) => { const s = new Set(prev); s.delete(order._id); return s; });
        }, 2500);
      }, 280); // slight delay for exit animation
    });
    return cleanup;
  }, [on]);

  // ── Real-time: new order placed ──────────────────────────────────────────
  useNewOrders(useCallback((order) => {
    setOrders((prev) => ({
      ...prev,
      Placed: [order, ...prev.Placed],
    }));
    setNewIds((prev) => new Set([...prev, order._id]));
    setTimeout(() => {
      setNewIds((prev) => { const s = new Set(prev); s.delete(order._id); return s; });
    }, 4000);
  }, []));

  // ── Advance status ───────────────────────────────────────────────────────
  const handleAdvance = async (orderId, currentStatus) => {
    const nextStatus = NEXT_STATUS[currentStatus];
    if (!nextStatus || updatingId) return;
    setUpdatingId(orderId);
    try {
      await adminAPI.updateOrderStatus(orderId, nextStatus);
    } catch {
      // socket event will handle UI on success; re-fetch on error
      fetchOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Total active ─────────────────────────────────────────────────────────
  const totalActive = orders.Placed.length + orders.Preparing.length + orders["Out for Delivery"].length;

  return (
    <div style={styles.wrap}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <h2 style={styles.title}>Live Order Pipeline</h2>
          <p style={styles.subtitle}>
            Real-time view — cards move automatically as status changes
          </p>
        </div>

        <div style={styles.topRight}>
          {/* Live indicator */}
          <div style={styles.liveIndicator}>
            <span style={styles.liveDot} />
            <span style={styles.liveLabel}>LIVE</span>
          </div>

          {/* Throughput */}
          <div style={styles.throughputPill}>
            <span style={styles.throughputIcon}>✅</span>
            <span style={styles.throughputValue}>{throughput.length}</span>
            <span style={styles.throughputLabel}>delivered this session</span>
          </div>

          {/* Active count */}
          <div style={styles.activePill}>
            <span style={styles.activeValue}>{totalActive}</span>
            <span style={styles.activeLabel}>active</span>
          </div>
        </div>
      </div>

      {/* ── Kanban pipeline ─────────────────────────────────────────────── */}
      {loading ? (
        <div style={styles.loadingRow}>
          {PIPELINE.map((col) => <ColumnSkeleton key={col.status} col={col} />)}
        </div>
      ) : (
        <div style={styles.pipeline}>
          {PIPELINE.map((col, colIdx) => (
            <PipelineColumn
              key={col.status}
              col={col}
              orders={orders[col.status] || []}
              isLast={colIdx === PIPELINE.length - 1}
              movingIds={movingIds}
              newIds={newIds}
              updatingId={updatingId}
              onAdvance={handleAdvance}
              showConnector={colIdx < PIPELINE.length - 1}
            />
          ))}
        </div>
      )}

      {/* ── Mini throughput timeline ────────────────────────────────────── */}
      {throughput.length > 0 && (
        <ThroughputBar deliveries={throughput} />
      )}
    </div>
  );
}

// ── Pipeline Column ───────────────────────────────────────────────────────────
function PipelineColumn({ col, orders, movingIds, newIds, updatingId, onAdvance, showConnector }) {
  const countRef  = useRef(orders.length);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (orders.length !== countRef.current) {
      countRef.current = orders.length;
      setBump(true);
      setTimeout(() => setBump(false), 400);
    }
  }, [orders.length]);

  return (
    <div style={styles.columnWrap}>
      {/* Column */}
      <div style={{ ...styles.column, borderColor: col.border, background: col.bg }}>
        {/* Column header */}
        <div style={styles.columnHeader}>
          <div style={styles.columnLeft}>
            <span style={styles.columnIcon}>{col.icon}</span>
            <span style={{ ...styles.columnTitle, color: col.color }}>{col.label}</span>
          </div>
          <span
            style={{
              ...styles.countBadge,
              background: col.color + "22",
              color: col.color,
              border: `1px solid ${col.color}44`,
            }}
            className={bump ? "count-bump" : ""}
          >
            {orders.length}
          </span>
        </div>

        {/* Thin accent line */}
        <div style={{ ...styles.accentLine, background: col.color }} />

        {/* Order cards */}
        <div style={styles.cardsList}>
          {orders.length === 0 ? (
            <div style={styles.emptyCol}>
              <span style={styles.emptyColIcon}>{col.icon}</span>
              <p style={styles.emptyColText}>No orders</p>
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                col={col}
                isMoving={movingIds.has(order._id)}
                isNew={newIds.has(order._id)}
                isUpdating={updatingId === order._id}
                canAdvance={!!NEXT_STATUS[order.status]}
                onAdvance={() => onAdvance(order._id, order.status)}
              />
            ))
          )}
        </div>
      </div>

      {/* Arrow connector between columns */}
      {showConnector && <FlowArrow color={col.color} />}
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, col, isMoving, isNew, isUpdating, canAdvance, onAdvance }) {
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  const isOverdue = elapsed > 20 && order.status !== "Delivered";

  return (
    <div
      style={{
        ...cardStyles.card,
        borderColor: isNew ? col.color + "88" : "var(--color-border-subtle)",
        boxShadow: isNew ? `0 0 0 2px ${col.color}22` : "none",
        opacity: isMoving ? 0.3 : 1,
        transform: isMoving ? "scale(0.95)" : "scale(1)",
        transition: "opacity 280ms ease, transform 280ms ease, border-color 400ms ease, box-shadow 400ms ease",
      }}
      className={isNew ? "card-enter" : ""}
    >
      {/* Top row */}
      <div style={cardStyles.topRow}>
        <span style={cardStyles.orderId}>#{order._id.slice(-6).toUpperCase()}</span>
        <span
          style={{
            ...cardStyles.elapsed,
            color: isOverdue ? "var(--color-error)" : "var(--color-text-muted)",
          }}
        >
          {isOverdue ? "⚠️" : "🕐"} {elapsed}m
        </span>
      </div>

      {/* Customer */}
      <p style={cardStyles.customer}>{order.user?.name || "Customer"}</p>

      {/* Item count */}
      <p style={cardStyles.items}>
        {order.items?.reduce((s, i) => s + i.quantity, 0) || 0} item
        {(order.items?.reduce((s, i) => s + i.quantity, 0) || 0) !== 1 ? "s" : ""} ·{" "}
        <span style={{ color: col.color, fontWeight: 600 }}>
          ${(order.totalAmount + 2.99).toFixed(2)}
        </span>
      </p>

      {/* Advance button */}
      {canAdvance && (
        <button
          onClick={onAdvance}
          disabled={isUpdating || isMoving}
          style={{
            ...cardStyles.advanceBtn,
            background: col.color + "22",
            color: col.color,
            borderColor: col.color + "44",
            opacity: isUpdating ? 0.6 : 1,
          }}
        >
          {isUpdating ? (
            <span style={cardStyles.spinner} />
          ) : (
            <>→ {NEXT_STATUS[order.status]}</>
          )}
        </button>
      )}

      {/* New flash overlay */}
      {isNew && (
        <div style={{
          ...cardStyles.newFlash,
          background: `linear-gradient(135deg, ${col.color}18, transparent)`,
        }} />
      )}
    </div>
  );
}

// ── Flow Arrow connector ──────────────────────────────────────────────────────
function FlowArrow({ color }) {
  return (
    <div style={arrowStyles.wrap}>
      {/* Animated dot */}
      <div style={{ ...arrowStyles.dot, background: color, animation: "flowDot 2.4s ease-in-out infinite" }} />
      <div style={{ ...arrowStyles.dot, background: color, animation: "flowDot 2.4s ease-in-out 0.8s infinite" }} />
      {/* Arrow line */}
      <div style={{ ...arrowStyles.line, background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />
      {/* Arrowhead */}
      <div style={{ ...arrowStyles.head, borderLeftColor: color + "88" }} />
    </div>
  );
}

// ── Throughput Bar ────────────────────────────────────────────────────────────
function ThroughputBar({ deliveries }) {
  const now = Date.now();
  return (
    <div style={throughputStyles.wrap}>
      <span style={throughputStyles.label}>Delivery timeline (this session)</span>
      <div style={throughputStyles.dots}>
        {deliveries.map((d, i) => {
          const secsAgo = Math.round((now - new Date(d).getTime()) / 1000);
          const label   = secsAgo < 60 ? `${secsAgo}s ago` : `${Math.round(secsAgo / 60)}m ago`;
          return (
            <div key={i} style={throughputStyles.dotWrap} title={label}>
              <div style={throughputStyles.dot} />
              <span style={throughputStyles.dotLabel}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Column Skeleton ───────────────────────────────────────────────────────────
function ColumnSkeleton({ col }) {
  return (
    <div style={styles.columnWrap}>
      <div style={{ ...styles.column, borderColor: col.border, background: col.bg }}>
        <div style={styles.columnHeader}>
          <span style={styles.columnIcon}>{col.icon}</span>
          <div className="skeleton" style={{ height: "20px", width: "80px", borderRadius: "4px" }} />
        </div>
        <div style={{ ...styles.accentLine, background: col.color }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "4px" }}>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "100px", borderRadius: "10px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: "20px" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" },
  topLeft: {},
  title: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", color: "var(--color-text-primary)", marginBottom: "4px" },
  subtitle: { color: "var(--color-text-muted)", fontSize: "0.8rem" },
  topRight: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  liveIndicator: { display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", background: "rgba(229,80,74,0.1)", border: "1px solid rgba(229,80,74,0.3)", borderRadius: "var(--radius-full)" },
  liveDot: { width: "7px", height: "7px", borderRadius: "50%", background: "var(--color-error)", animation: "pulse 1.2s ease infinite" },
  liveLabel: { color: "var(--color-error)", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em" },
  throughputPill: { display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", background: "rgba(76,175,130,0.1)", border: "1px solid rgba(76,175,130,0.2)", borderRadius: "var(--radius-full)" },
  throughputIcon: { fontSize: "0.85rem" },
  throughputValue: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "var(--color-success)" },
  throughputLabel: { color: "var(--color-text-muted)", fontSize: "0.72rem" },
  activePill: { display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: "var(--radius-full)" },
  activeValue: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", color: "var(--color-primary)" },
  activeLabel: { color: "var(--color-text-muted)", fontSize: "0.72rem" },
  loadingRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0", alignItems: "start" },
  pipeline: { display: "grid", gridTemplateColumns: "1fr 32px 1fr 32px 1fr 32px 1fr", gap: "0", alignItems: "start", overflowX: "auto" },
  columnWrap: { display: "contents" },
  column: { border: "1.5px solid", borderRadius: "var(--radius-lg)", overflow: "hidden", minHeight: "300px", display: "flex", flexDirection: "column" },
  columnHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px" },
  columnLeft: { display: "flex", alignItems: "center", gap: "8px" },
  columnIcon: { fontSize: "1.1rem" },
  columnTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem" },
  countBadge: { minWidth: "24px", height: "24px", borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.8rem", padding: "0 6px", transition: "transform 300ms ease" },
  accentLine: { height: "2px", width: "100%", opacity: 0.6 },
  cardsList: { padding: "12px 10px", display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflowY: "auto", maxHeight: "480px" },
  emptyCol: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", padding: "40px 16px", flex: 1 },
  emptyColIcon: { fontSize: "1.8rem", opacity: 0.3 },
  emptyColText: { color: "var(--color-text-muted)", fontSize: "0.78rem" },
};

const cardStyles = {
  card: { position: "relative", background: "var(--color-bg-card)", border: "1.5px solid", borderRadius: "var(--radius-md)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px", overflow: "hidden", cursor: "default" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--color-text-primary)" },
  elapsed: { fontSize: "0.72rem", fontWeight: 600 },
  customer: { color: "var(--color-text-secondary)", fontSize: "0.78rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  items: { color: "var(--color-text-muted)", fontSize: "0.75rem" },
  advanceBtn: { marginTop: "4px", padding: "6px 10px", border: "1px solid", borderRadius: "var(--radius-sm)", background: "transparent", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, fontFamily: "var(--font-display)", transition: "all 150ms ease", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" },
  spinner: { width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "currentColor", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" },
  newFlash: { position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit", animation: "fadeIn 0.3s ease, pulse 2s ease 0.3s 3" },
};

const arrowStyles = {
  wrap: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "48px", marginTop: "48px", overflow: "visible" },
  line: { position: "absolute", width: "100%", height: "2px" },
  dot: { position: "absolute", left: "4px", width: "8px", height: "8px", borderRadius: "50%", zIndex: 2 },
  head: { position: "absolute", right: "0px", width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid" },
};

const throughputStyles = {
  wrap: { display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", flexWrap: "wrap" },
  label: { color: "var(--color-text-muted)", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" },
  dots: { display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap", flex: 1 },
  dotWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  dot: { width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-success)", boxShadow: "0 0 8px rgba(76,175,130,0.5)" },
  dotLabel: { color: "var(--color-text-muted)", fontSize: "0.65rem", whiteSpace: "nowrap" },
};
