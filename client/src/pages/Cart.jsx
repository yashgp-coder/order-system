import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { orderAPI } from "../services/api";
import toast from "react-hot-toast";
import RecommendationShelf from "../components/RecommendationShelf";

const DELIVERY_FEE = 2.99;

export default function Cart() {
  const navigate = useNavigate();
  const { items, totalAmount, totalItems, updateQuantity, removeItem, clearCart } = useCart();

  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [placing, setPlacing] = useState(false);

  const grandTotal = totalAmount + DELIVERY_FEE;

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!address.trim()) {
      toast.error("Please enter a delivery address.");
      return;
    }

    setPlacing(true);
    try {
      const payload = {
        items: items.map((i) => ({
          menuItem: i._id,
          name:     i.name,
          price:    i.price,
          quantity: i.quantity,
        })),
        totalAmount,
        deliveryAddress:     address.trim(),
        specialInstructions: instructions.trim(),
      };

      const { data } = await orderAPI.create(payload);
      clearCart();
      toast.success("Order placed successfully! 🎉");
      navigate(`/orders/${data.order._id}`);
    } catch (err) {
      toast.error(err?.message || "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // ── Empty cart ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyWrap}>
          <span style={styles.emptyIcon}>🛒</span>
          <h2 style={styles.emptyTitle}>Your cart is empty</h2>
          <p style={styles.emptyText}>Add some items from the menu to get started.</p>
          <Link to="/menu" style={styles.browseBtn}>Browse Menu →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div style={styles.header}>
          <h1 style={styles.title}>Checkout</h1>
          <p style={styles.subtitle}>{totalItems} item{totalItems !== 1 ? "s" : ""} in your order</p>
        </div>

        <div style={styles.layout}>
          {/* ── Left: Order Items ─────────────────────────────────────── */}
          <div style={styles.left}>
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Order Summary</h2>
                <button
                  onClick={() => { clearCart(); toast("Cart cleared."); }}
                  style={styles.clearBtn}
                >
                  Clear all
                </button>
              </div>

              <div style={styles.itemsList}>
                {items.map((item) => (
                  <CheckoutItem
                    key={item._id}
                    item={item}
                    onRemove={() => removeItem(item._id)}
                    onUpdate={(qty) => updateQuantity(item._id, qty)}
                  />
                ))}
              </div>
            </div>
            <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
                <RecommendationShelf
                  mode="similar"
                  itemIds={items.map((i) => i._id)}
                  title="🍽️ Add something else?"
                  maxItems={6}
                />
              </div>

            {/* ── Delivery Details ─────────────────────────────────────── */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Delivery Details</h2>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  Delivery Address <span style={styles.required}>*</span>
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your full delivery address..."
                  style={styles.textarea}
                  rows={3}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Special Instructions <span style={styles.optional}>(optional)</span></label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="E.g. Ring doorbell, no onions, extra sauce..."
                  style={styles.textarea}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* ── Right: Price Summary ──────────────────────────────────── */}
          <div style={styles.right}>
            <div style={styles.summaryCard}>
              <h2 style={styles.sectionTitle}>Price Breakdown</h2>

              <div style={styles.priceRows}>
                {items.map((item) => (
                  <div key={item._id} style={styles.priceRow}>
                    <span style={styles.priceLabel}>
                      {item.name} <span style={styles.priceQty}>×{item.quantity}</span>
                    </span>
                    <span style={styles.priceValue}>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={styles.divider} />

              <div style={styles.priceRow}>
                <span style={styles.priceLabel}>Subtotal</span>
                <span style={styles.priceValue}>${totalAmount.toFixed(2)}</span>
              </div>
              <div style={styles.priceRow}>
                <span style={styles.priceLabel}>Delivery fee</span>
                <span style={styles.priceValue}>${DELIVERY_FEE.toFixed(2)}</span>
              </div>

              <div style={styles.divider} />

              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Total</span>
                <span style={styles.totalValue}>${grandTotal.toFixed(2)}</span>
              </div>

              {/* Estimated time */}
              <div style={styles.etaBanner}>
                <span style={styles.etaIcon}>⏱️</span>
                <div>
                  <p style={styles.etaTitle}>Estimated delivery</p>
                  <p style={styles.etaTime}>25 – 40 minutes</p>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placing || !address.trim()}
                style={{
                  ...styles.placeBtn,
                  ...((placing || !address.trim()) ? styles.placeBtnDisabled : {}),
                }}
              >
                {placing ? (
                  <span style={styles.spinnerRow}>
                    <span style={styles.spinner} />
                    Placing Order...
                  </span>
                ) : (
                  `Place Order · $${grandTotal.toFixed(2)}`
                )}
              </button>

              <Link to="/menu" style={styles.backLink}>← Continue Shopping</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Checkout Item row ─────────────────────────────────────────────────────────
function CheckoutItem({ item, onRemove, onUpdate }) {
  return (
    <div style={itemStyles.row}>
      <div style={itemStyles.imgWrap}>
        {item.image
          ? <img src={item.image} alt={item.name} style={itemStyles.img} />
          : <div style={itemStyles.imgFallback}>🍔</div>
        }
      </div>
      <div style={itemStyles.info}>
        <p style={itemStyles.name}>{item.name}</p>
        <p style={itemStyles.unitPrice}>${item.price.toFixed(2)} each</p>
      </div>
      <div style={itemStyles.controls}>
        <button onClick={() => onUpdate(item.quantity - 1)} style={itemStyles.qtyBtn}>−</button>
        <span style={itemStyles.qty}>{item.quantity}</span>
        <button onClick={() => onUpdate(item.quantity + 1)} style={{ ...itemStyles.qtyBtn, color: "var(--color-primary)" }}>+</button>
      </div>
      <div style={itemStyles.right}>
        <p style={itemStyles.lineTotal}>${(item.price * item.quantity).toFixed(2)}</p>
        <button onClick={onRemove} style={itemStyles.removeBtn} title="Remove item">✕</button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: "calc(100vh - 64px)", background: "var(--color-bg)", padding: "32px 0 80px" },
  container: { maxWidth: "1100px", margin: "0 auto", padding: "0 24px" },
  header: { marginBottom: "32px" },
  title: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem", color: "var(--color-text-primary)", marginBottom: "6px" },
  subtitle: { color: "var(--color-text-muted)", fontSize: "0.95rem" },
  layout: { display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px", alignItems: "start" },
  left: { display: "flex", flexDirection: "column", gap: "20px" },
  section: { background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "24px" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  sectionTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text-primary)" },
  clearBtn: { background: "none", border: "none", color: "var(--color-text-muted)", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", fontFamily: "var(--font-body)" },
  itemsList: { display: "flex", flexDirection: "column", gap: "12px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" },
  label: { fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)" },
  required: { color: "var(--color-error)" },
  optional: { color: "var(--color-text-muted)", fontWeight: 400, fontSize: "0.8rem" },
  textarea: { resize: "vertical", minHeight: "72px", fontFamily: "var(--font-body)", fontSize: "0.9rem", lineHeight: 1.5 },
  right: {},
  summaryCard: { background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "24px", position: "sticky", top: "84px", display: "flex", flexDirection: "column", gap: "0" },
  priceRows: { margin: "16px 0 0", display: "flex", flexDirection: "column", gap: "8px" },
  priceRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" },
  priceLabel: { color: "var(--color-text-secondary)", fontSize: "0.875rem", flex: 1 },
  priceQty: { color: "var(--color-text-muted)", fontSize: "0.78rem" },
  priceValue: { color: "var(--color-text-primary)", fontSize: "0.875rem", fontWeight: 500, flexShrink: 0 },
  divider: { height: "1px", background: "var(--color-border)", margin: "16px 0" },
  totalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  totalLabel: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text-primary)" },
  totalValue: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem", color: "var(--color-primary)" },
  etaBanner: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "rgba(76,175,130,0.08)", border: "1px solid rgba(76,175,130,0.2)", borderRadius: "var(--radius-md)", marginBottom: "20px" },
  etaIcon: { fontSize: "1.4rem" },
  etaTitle: { fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "2px" },
  etaTime: { fontSize: "0.9rem", fontWeight: 600, color: "var(--color-success)" },
  placeBtn: { width: "100%", height: "52px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "all 150ms ease", marginBottom: "12px" },
  placeBtnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  spinnerRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  spinner: { width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" },
  backLink: { display: "block", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.875rem", textDecoration: "none" },
  emptyWrap: { maxWidth: "400px", margin: "120px auto", textAlign: "center", padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" },
  emptyIcon: { fontSize: "4rem" },
  emptyTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", color: "var(--color-text-primary)" },
  emptyText: { color: "var(--color-text-muted)", fontSize: "0.95rem" },
  browseBtn: { padding: "12px 28px", background: "var(--color-primary)", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 700, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: "0.95rem" },
};

const itemStyles = {
  row: { display: "flex", alignItems: "center", gap: "14px", padding: "14px", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-subtle)" },
  imgWrap: { width: "56px", height: "56px", flexShrink: 0, borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--color-bg-card)" },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  imgFallback: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" },
  info: { flex: 1, minWidth: 0 },
  name: { color: "var(--color-text-primary)", fontWeight: 600, fontSize: "0.9rem", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  unitPrice: { color: "var(--color-text-muted)", fontSize: "0.78rem" },
  controls: { display: "flex", alignItems: "center", gap: "10px", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "4px 8px" },
  qtyBtn: { background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: "1.1rem", cursor: "pointer", fontWeight: 700, padding: "0 2px", lineHeight: 1 },
  qty: { color: "var(--color-text-primary)", fontWeight: 700, fontSize: "0.9rem", minWidth: "18px", textAlign: "center" },
  right: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 },
  lineTotal: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" },
  removeBtn: { background: "none", border: "none", color: "var(--color-text-muted)", fontSize: "0.75rem", cursor: "pointer", padding: "2px 4px", borderRadius: "4px", transition: "color 150ms ease" },
};
