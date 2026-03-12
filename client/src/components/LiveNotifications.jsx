import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";

const STATUS_MESSAGES = {
  Preparing:         { emoji: "👨‍🍳", title: "Kitchen is cooking!",      msg: "Your order is now being prepared."        },
  "Out for Delivery":{ emoji: "🛵", title: "On the way!",              msg: "Your order is out for delivery."          },
  Delivered:         { emoji: "✅", title: "Order Delivered!",         msg: "Enjoy your meal. Thanks for ordering!"    },
  Cancelled:         { emoji: "❌", title: "Order Cancelled",          msg: "Your order has been cancelled."           },
  Placed:            { emoji: "📋", title: "Order Confirmed!",         msg: "We've received your order."              },
};

/**
 * LiveNotifications
 *
 * Mount this once at the app root.
 * It silently listens for socket events and surfaces them as toast notifications.
 * Users can click the toast to jump to the order tracking page.
 */
export default function LiveNotifications() {
  const { on } = useSocket();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Track shown notifications to avoid duplicates on reconnect
  const shownRef = useRef(new Set());

  // ── Listen: order status changed (regular user) ─────────────────────────
  useEffect(() => {
    const cleanup = on("order:statusUpdated", ({ order }) => {
      const dedupeKey = `${order._id}-${order.status}`;
      if (shownRef.current.has(dedupeKey)) return;
      shownRef.current.add(dedupeKey);

      const cfg = STATUS_MESSAGES[order.status];
      if (!cfg) return;

      const shortId = order._id.slice(-6).toUpperCase();

      toast.custom(
        (t) => (
          <div
            onClick={() => { navigate(`/orders/${order._id}`); toast.dismiss(t.id); }}
            style={{
              ...toastStyles.wrap,
              opacity: t.visible ? 1 : 0,
              transform: t.visible ? "translateX(0)" : "translateX(20px)",
            }}
          >
            <span style={toastStyles.emoji}>{cfg.emoji}</span>
            <div style={toastStyles.body}>
              <p style={toastStyles.title}>{cfg.title}</p>
              <p style={toastStyles.msg}>
                Order <strong>#{shortId}</strong> — {cfg.msg}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
              style={toastStyles.close}
            >
              ✕
            </button>
          </div>
        ),
        { duration: 8000, id: dedupeKey }
      );
    });

    return cleanup;
  }, [on, navigate]);

  // ── Listen: new order placed (admin only) ───────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;

    const cleanup = on("order:placed", ({ order }) => {
      const dedupeKey = `new-${order._id}`;
      if (shownRef.current.has(dedupeKey)) return;
      shownRef.current.add(dedupeKey);

      const shortId = order._id.slice(-6).toUpperCase();
      const total   = (order.totalAmount + 2.99).toFixed(2);

      toast.custom(
        (t) => (
          <div
            onClick={() => { navigate(`/admin`); toast.dismiss(t.id); }}
            style={{
              ...toastStyles.wrap,
              ...toastStyles.adminWrap,
              opacity: t.visible ? 1 : 0,
              transform: t.visible ? "translateX(0)" : "translateX(20px)",
            }}
          >
            <span style={toastStyles.emoji}>🔔</span>
            <div style={toastStyles.body}>
              <p style={toastStyles.title}>New Order Received!</p>
              <p style={toastStyles.msg}>
                Order <strong>#{shortId}</strong> · ${total}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
              style={toastStyles.close}
            >
              ✕
            </button>
          </div>
        ),
        { duration: 12000, id: dedupeKey }
      );
    });

    return cleanup;
  }, [on, isAdmin, navigate]);

  // ── Listen: queue update (admin only, silent — no toast) ────────────────
  // Queue updates are displayed in the admin dashboard directly

  return null; // Renders nothing — pure side-effect component
}

// ── Toast styles ──────────────────────────────────────────────────────────────
const toastStyles = {
  wrap: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px 16px",
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    maxWidth: "360px",
    cursor: "pointer",
    transition: "opacity 200ms ease, transform 200ms ease",
    fontFamily: "var(--font-body)",
  },
  adminWrap: {
    borderColor: "rgba(255,107,53,0.3)",
    background: "linear-gradient(135deg, var(--color-bg-card) 0%, rgba(255,107,53,0.04) 100%)",
  },
  emoji: {
    fontSize: "1.5rem",
    flexShrink: 0,
    lineHeight: 1,
    marginTop: "2px",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "var(--color-text-primary)",
    marginBottom: "3px",
  },
  msg: {
    fontSize: "0.8rem",
    color: "var(--color-text-secondary)",
    lineHeight: 1.4,
  },
  close: {
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    fontSize: "0.75rem",
    padding: "2px 4px",
    flexShrink: 0,
    marginTop: "-2px",
    borderRadius: "4px",
  },
};
