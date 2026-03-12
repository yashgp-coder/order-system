import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { orderAPI } from "../services/api";
import { useOrderStatus } from "../hooks/useOrderStatus";

const STATUS_STEPS = ["Placed", "Preparing", "Out for Delivery", "Delivered"];

const STEP_CONFIG = {
  "Placed":           { icon: "📋", label: "Order Placed",     desc: "Your order has been received and confirmed." },
  "Preparing":        { icon: "👨‍🍳", label: "Preparing",        desc: "The kitchen is preparing your food right now." },
  "Out for Delivery": { icon: "🛵", label: "Out for Delivery", desc: "Your order is on its way to you!" },
  "Delivered":        { icon: "✅", label: "Delivered",        desc: "Enjoy your meal! Thank you for ordering." },
};

const STATUS_COLORS = {
  "Placed":           "var(--status-placed)",
  "Preparing":        "var(--status-preparing)",
  "Out for Delivery": "var(--status-delivery)",
  "Delivered":        "var(--status-delivered)",
  "Cancelled":        "var(--status-cancelled)",
};

export default function OrderTracking() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  /* ── Real-time order status hook ───────────────────────── */
  const {
    status: liveStatus,
    queuePosition: liveQueue,
    estimatedTime: liveETA,
    statusHistory: liveHistory,
    lastUpdated
  } = useOrderStatus(id, order);

  /* ── Fetch Order ───────────────────────────────────────── */
  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await orderAPI.getById(id);
      setOrder(data.order);
    } catch (err) {
      setError(err?.message || "Order not found.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  /* ── Apply live updates from socket hook ───────────────── */
  useEffect(() => {
    if (!lastUpdated || !order) return;

    setOrder((prev) => ({
      ...prev,
      status: liveStatus,
      queuePosition: liveQueue,
      estimatedTime: liveETA,
      statusHistory: liveHistory,
    }));

    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 3000);

  }, [lastUpdated]);

  /* ── Cancel Order ─────────────────────────────────────── */
  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    setCancelLoading(true);

    try {
      await orderAPI.cancelOrder(id);
      await fetchOrder();
    } catch {
      await fetchOrder();
    } finally {
      setCancelLoading(false);
    }
  };

  /* ── Loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────── */
  if (error || !order) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.errorWrap}>
            <span style={styles.errorIcon}>😕</span>
            <h2 style={styles.errorTitle}>Order not found</h2>
            <p style={styles.errorText}>{error}</p>
            <Link to="/orders" style={styles.backBtn}>← Back to Orders</Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === "Cancelled";
  const isDelivered = order.status === "Delivered";
  const currentIdx = STATUS_STEPS.indexOf(order.status);
  const statusColor = STATUS_COLORS[order.status] || "var(--color-text-muted)";

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Breadcrumb */}
        <div style={styles.breadcrumb}>
          <Link to="/orders" style={styles.breadcrumbLink}>My Orders</Link>
          <span style={styles.breadcrumbSep}>›</span>
          <span style={styles.breadcrumbCurrent}>
            #{order._id.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* Real-time flash */}
        {justUpdated && (
          <div style={styles.updateFlash}>
            🔔 Order status just updated in real-time!
          </div>
        )}

        <div style={styles.layout}>

          {/* LEFT SIDE */}
          <div style={styles.left}>

            {/* Hero Status */}
            <div style={{ ...styles.heroCard, borderColor: statusColor + "44" }}>
              {isCancelled ? (
                <div style={styles.cancelledState}>
                  <span style={styles.cancelIcon}>❌</span>
                  <h2 style={{ ...styles.heroTitle, color: "var(--color-error)" }}>
                    Order Cancelled
                  </h2>
                </div>
              ) : (
                <>
                  <div style={styles.heroTop}>
                    <span style={styles.heroIcon}>
                      {STEP_CONFIG[order.status]?.icon || "📋"}
                    </span>

                    <div>
                      <h2 style={{ ...styles.heroTitle, color: statusColor }}>
                        {STEP_CONFIG[order.status]?.label}
                      </h2>
                      <p style={styles.heroSubtitle}>
                        {STEP_CONFIG[order.status]?.desc}
                      </p>
                    </div>
                  </div>

                  {order.status === "Preparing" && order.queuePosition && (
                    <div style={styles.queueBanner}>
                      <div style={styles.queueItem}>
                        <span style={styles.queueNum}>#{order.queuePosition}</span>
                        <span style={styles.queueLabel}>in queue</span>
                      </div>

                      <div style={styles.queueDivider} />

                      <div style={styles.queueItem}>
                        <span style={styles.queueNum}>~{order.estimatedTime}m</span>
                        <span style={styles.queueLabel}>estimated</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Stepper */}
            {!isCancelled && (
              <div style={styles.stepperCard}>
                <h3 style={styles.cardTitle}>Order Progress</h3>

                <div style={styles.stepper}>
                  {STATUS_STEPS.map((step, i) => {

                    const isDone = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    const cfg = STEP_CONFIG[step];

                    return (
                      <div key={step} style={styles.stepRow}>

                        {i > 0 && (
                          <div style={{
                            ...styles.stepConnector,
                            background: isDone
                              ? "var(--color-primary)"
                              : "var(--color-border)"
                          }} />
                        )}

                        <div style={styles.stepContent}>
                          <div style={{
                            ...styles.stepDot,
                            background: isDone
                              ? "var(--color-primary)"
                              : "var(--color-bg-elevated)"
                          }}>
                            {isDone && <span style={styles.stepCheck}>✓</span>}
                          </div>

                          <div style={styles.stepText}>
                            <p style={styles.stepLabel}>
                              {cfg.label}
                              {isCurrent && (
                                <span style={styles.currentTag}>Current</span>
                              )}
                            </p>

                            {isDone && order.statusHistory && (
                              <p style={styles.stepTime}>
                                {formatTime(
                                  order.statusHistory.find(
                                    (h) => h.status === step
                                  )?.changedAt
                                )}
                              </p>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {order.status === "Placed" && (
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                style={styles.cancelBtn}
              >
                {cancelLoading ? "Cancelling..." : "Cancel Order"}
              </button>
            )}

          </div>

          {/* RIGHT SIDE */}
          <div style={styles.right}>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Items Ordered</h3>

              {order.items.map((item, i) => (
                <div key={i} style={styles.itemRow}>
                  <p style={styles.itemName}>{item.name}</p>
                  <p style={styles.itemQty}>Qty: {item.quantity}</p>
                  <p style={styles.itemPrice}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Delivery Info</h3>

              <p style={styles.infoValue}>{order.deliveryAddress}</p>

              <p style={styles.infoValue}>
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>

            {isDelivered && (
              <Link to="/menu" style={styles.reorderBtn}>
                🔄 Order Again
              </Link>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────── */

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
};


// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: "calc(100vh - 64px)", background: "var(--color-bg)", padding: "28px 0 80px" },
  container: { maxWidth: "1000px", margin: "0 auto", padding: "0 24px" },
  breadcrumb: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" },
  breadcrumbLink: { color: "var(--color-text-muted)", fontSize: "0.875rem", textDecoration: "none" },
  breadcrumbSep: { color: "var(--color-border)", fontSize: "0.875rem" },
  breadcrumbCurrent: { color: "var(--color-text-secondary)", fontSize: "0.875rem", fontWeight: 600 },
  updateFlash: { background: "rgba(76,175,130,0.12)", border: "1px solid rgba(76,175,130,0.3)", color: "var(--color-success)", padding: "10px 16px", borderRadius: "var(--radius-md)", marginBottom: "20px", fontSize: "0.875rem", fontWeight: 600, animation: "fadeIn 0.3s ease" },
  layout: { display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" },
  left: { display: "flex", flexDirection: "column", gap: "16px" },
  right: { display: "flex", flexDirection: "column", gap: "16px" },
  heroCard: { background: "var(--color-bg-card)", border: "1.5px solid", borderRadius: "var(--radius-lg)", padding: "24px", transition: "border-color 500ms ease" },
  heroTop: { display: "flex", alignItems: "flex-start", gap: "16px" },
  heroIcon: { fontSize: "2.5rem", flexShrink: 0 },
  heroTitle: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "6px" },
  heroSubtitle: { color: "var(--color-text-muted)", fontSize: "0.9rem", lineHeight: 1.5 },
  cancelledState: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "12px 0", textAlign: "center" },
  cancelIcon: { fontSize: "2.5rem" },
  queueBanner: { display: "flex", alignItems: "center", gap: "0", marginTop: "20px", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden" },
  queueItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px" },
  queueNum: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.6rem", color: "var(--color-primary)", lineHeight: 1 },
  queueLabel: { color: "var(--color-text-muted)", fontSize: "0.75rem", marginTop: "4px" },
  queueDivider: { width: "1px", background: "var(--color-border)", alignSelf: "stretch" },
  stepperCard: { background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "24px" },
  stepper: { display: "flex", flexDirection: "column", marginTop: "20px" },
  stepRow: { display: "flex", flexDirection: "column" },
  stepConnector: { width: "2px", height: "28px", marginLeft: "13px", transition: "background 500ms ease" },
  stepContent: { display: "flex", alignItems: "flex-start", gap: "14px" },
  stepDot: { width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 400ms ease" },
  stepCheck: { color: "#fff", fontSize: "0.75rem", fontWeight: 700 },
  stepText: { paddingBottom: "8px", flex: 1 },
  stepLabel: { fontSize: "0.9rem", lineHeight: 1.3, display: "flex", alignItems: "center", gap: "8px" },
  currentTag: { background: "rgba(255,107,53,0.15)", color: "var(--color-primary)", fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px", borderRadius: "var(--radius-full)" },
  stepTime: { color: "var(--color-text-muted)", fontSize: "0.75rem", marginTop: "3px" },
  cancelBtn: { padding: "12px", width: "100%", background: "transparent", border: "1.5px solid var(--color-error)", color: "var(--color-error)", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", transition: "all 150ms ease" },
  card: { background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px" },
  cardTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  itemCount: { color: "var(--color-text-muted)", fontSize: "0.8rem", fontWeight: 400 },
  itemsList: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" },
  itemRow: { display: "flex", alignItems: "center", gap: "10px" },
  itemImgWrap: { width: "40px", height: "40px", borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--color-bg-elevated)", flexShrink: 0 },
  itemImg: { width: "100%", height: "100%", objectFit: "cover" },
  itemImgFallback: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemQty: { color: "var(--color-text-muted)", fontSize: "0.75rem" },
  itemPrice: { color: "var(--color-text-primary)", fontWeight: 600, fontSize: "0.875rem", flexShrink: 0 },
  totalsWrap: { borderTop: "1px solid var(--color-border-subtle)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px" },
  totalRow: { display: "flex", justifyContent: "space-between" },
  totalLabel: { color: "var(--color-text-secondary)", fontSize: "0.85rem" },
  totalValue: { color: "var(--color-text-secondary)", fontSize: "0.85rem" },
  divider: { height: "1px", background: "var(--color-border)", margin: "4px 0" },
  grandTotal: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--color-primary)" },
  infoRow: { display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" },
  infoIcon: { fontSize: "1.1rem", flexShrink: 0, marginTop: "1px" },
  infoLabel: { color: "var(--color-text-muted)", fontSize: "0.75rem", marginBottom: "3px" },
  infoValue: { color: "var(--color-text-primary)", fontSize: "0.875rem", lineHeight: 1.4 },
  reorderBtn: { display: "block", textAlign: "center", padding: "13px", background: "var(--color-primary)", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 700, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: "0.9rem", transition: "all 150ms ease" },
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "120px 24px" },
  spinner: { width: "40px", height: "40px", border: "3px solid var(--color-border)", borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "var(--color-text-muted)", fontSize: "0.95rem" },
  errorWrap: { textAlign: "center", padding: "120px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" },
  errorIcon: { fontSize: "3rem" },
  errorTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem", color: "var(--color-text-primary)" },
  errorText: { color: "var(--color-text-muted)", fontSize: "0.9rem" },
  backBtn: { padding: "10px 24px", marginTop: "8px", background: "var(--color-primary)", color: "#fff", borderRadius: "var(--radius-md)", textDecoration: "none", fontWeight: 700, fontFamily: "var(--font-display)" },
};
