import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function CartDrawer() {
  const navigate = useNavigate();
  const { items, isCartOpen, closeCart, removeItem, updateQuantity, totalItems, totalAmount, clearCart } = useCart();

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") closeCart(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeCart]);

  const handleCheckout = () => {
    closeCart();
    navigate("/cart");
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={closeCart} />

      {/* Drawer */}
      <div style={styles.drawer}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>🛒</span>
            <h2 style={styles.headerTitle}>Your Cart</h2>
            {totalItems > 0 && (
              <span style={styles.itemCount}>{totalItems} {totalItems === 1 ? "item" : "items"}</span>
            )}
          </div>
          <button onClick={closeCart} style={styles.closeBtn} aria-label="Close cart">✕</button>
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🍽️</span>
            <p style={styles.emptyTitle}>Your cart is empty</p>
            <p style={styles.emptySubtitle}>Add some delicious items from the menu!</p>
            <button onClick={closeCart} style={styles.browseBtn}>Browse Menu →</button>
          </div>
        ) : (
          <>
            {/* Clear all */}
            <div style={styles.clearRow}>
              <button onClick={clearCart} style={styles.clearBtn}>Clear all</button>
            </div>

            {/* Items List */}
            <div style={styles.itemsList}>
              {items.map((item) => (
                <CartItem
                  key={item._id}
                  item={item}
                  onRemove={() => removeItem(item._id)}
                  onUpdate={(qty) => updateQuantity(item._id, qty)}
                />
              ))}
            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <div style={styles.subtotalRow}>
                <span style={styles.subtotalLabel}>Subtotal</span>
                <span style={styles.subtotalAmount}>${totalAmount.toFixed(2)}</span>
              </div>
              <div style={styles.feeRow}>
                <span style={styles.feeLabel}>Delivery fee</span>
                <span style={styles.feeAmount}>$2.99</span>
              </div>
              <div style={styles.divider} />
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Total</span>
                <span style={styles.totalAmount}>${(totalAmount + 2.99).toFixed(2)}</span>
              </div>
              <button onClick={handleCheckout} style={styles.checkoutBtn}>
                Proceed to Checkout →
              </button>
              <button onClick={closeCart} style={styles.continueBtn}>
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Cart Item sub-component ────────────────────────────────────────────────────
function CartItem({ item, onRemove, onUpdate }) {
  return (
    <div style={itemStyles.wrap}>
      {/* Image */}
      <div style={itemStyles.imgWrap}>
        {item.image ? (
          <img src={item.image} alt={item.name} style={itemStyles.img} />
        ) : (
          <div style={itemStyles.imgPlaceholder}>🍔</div>
        )}
      </div>

      {/* Info */}
      <div style={itemStyles.info}>
        <p style={itemStyles.name}>{item.name}</p>
        <p style={itemStyles.price}>${(item.price * item.quantity).toFixed(2)}</p>
        <p style={itemStyles.unitPrice}>${item.price.toFixed(2)} each</p>
      </div>

      {/* Quantity Controls */}
      <div style={itemStyles.controls}>
        <button
          onClick={() => onUpdate(item.quantity - 1)}
          style={itemStyles.qtyBtn}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span style={itemStyles.qty}>{item.quantity}</span>
        <button
          onClick={() => onUpdate(item.quantity + 1)}
          style={{ ...itemStyles.qtyBtn, ...itemStyles.qtyBtnPlus }}
          aria-label="Increase quantity"
          disabled={item.quantity >= 20}
        >
          +
        </button>
      </div>

      {/* Remove */}
      <button onClick={onRemove} style={itemStyles.removeBtn} aria-label="Remove item">
        🗑️
      </button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  backdrop: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    zIndex: "var(--z-modal)",
    animation: "fadeIn 0.2s ease forwards",
  },
  drawer: {
    position: "fixed", top: 0, right: 0, bottom: 0,
    width: "100%", maxWidth: "420px",
    background: "var(--color-bg-elevated)",
    borderLeft: "1px solid var(--color-border)",
    zIndex: "calc(var(--z-modal) + 1)",
    display: "flex", flexDirection: "column",
    animation: "slideInRight 0.3s ease forwards",
    boxShadow: "var(--shadow-lg)",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid var(--color-border)",
    flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  headerIcon: { fontSize: "1.3rem" },
  headerTitle: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: "1.2rem", color: "var(--color-text-primary)",
  },
  itemCount: {
    background: "rgba(255,107,53,0.15)", color: "var(--color-primary)",
    fontSize: "0.75rem", fontWeight: 600,
    padding: "2px 8px", borderRadius: "var(--radius-full)",
  },
  closeBtn: {
    width: "32px", height: "32px", borderRadius: "50%",
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    color: "var(--color-text-muted)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.85rem", transition: "all 150ms ease",
  },
  clearRow: {
    padding: "10px 24px", display: "flex", justifyContent: "flex-end",
    borderBottom: "1px solid var(--color-border-subtle)",
  },
  clearBtn: {
    background: "none", border: "none",
    color: "var(--color-text-muted)", fontSize: "0.8rem",
    cursor: "pointer", textDecoration: "underline",
    fontFamily: "var(--font-body)",
  },
  emptyState: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "40px 24px", gap: "12px",
  },
  emptyIcon: { fontSize: "3.5rem", marginBottom: "8px" },
  emptyTitle: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: "1.2rem", color: "var(--color-text-primary)",
  },
  emptySubtitle: { color: "var(--color-text-muted)", fontSize: "0.9rem", textAlign: "center" },
  browseBtn: {
    marginTop: "8px", padding: "10px 24px",
    background: "var(--color-primary)", color: "#fff",
    border: "none", borderRadius: "var(--radius-md)",
    fontWeight: 600, cursor: "pointer",
    fontFamily: "var(--font-display)", fontSize: "0.9rem",
  },
  itemsList: { flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "4px" },
  footer: {
    padding: "20px 24px",
    borderTop: "1px solid var(--color-border)",
    flexShrink: 0,
    background: "var(--color-bg-card)",
  },
  subtotalRow: { display: "flex", justifyContent: "space-between", marginBottom: "8px" },
  subtotalLabel: { color: "var(--color-text-secondary)", fontSize: "0.9rem" },
  subtotalAmount: { color: "var(--color-text-primary)", fontSize: "0.9rem", fontWeight: 500 },
  feeRow: { display: "flex", justifyContent: "space-between", marginBottom: "12px" },
  feeLabel: { color: "var(--color-text-muted)", fontSize: "0.85rem" },
  feeAmount: { color: "var(--color-text-muted)", fontSize: "0.85rem" },
  divider: { height: "1px", background: "var(--color-border)", margin: "12px 0" },
  totalRow: { display: "flex", justifyContent: "space-between", marginBottom: "16px" },
  totalLabel: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: "1rem", color: "var(--color-text-primary)",
  },
  totalAmount: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: "1.1rem", color: "var(--color-primary)",
  },
  checkoutBtn: {
    width: "100%", height: "50px",
    background: "var(--color-primary)", color: "#fff",
    border: "none", borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: "0.95rem", cursor: "pointer",
    transition: "all 150ms ease", marginBottom: "10px",
  },
  continueBtn: {
    width: "100%", height: "42px",
    background: "transparent", color: "var(--color-text-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-body)", fontWeight: 500,
    fontSize: "0.875rem", cursor: "pointer",
    transition: "all 150ms ease",
  },
};

const itemStyles = {
  wrap: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "12px", borderRadius: "var(--radius-md)",
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border-subtle)",
    transition: "border-color 150ms ease",
  },
  imgWrap: {
    width: "52px", height: "52px", flexShrink: 0,
    borderRadius: "var(--radius-sm)", overflow: "hidden",
    background: "var(--color-bg-elevated)",
  },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  imgPlaceholder: {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.5rem",
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    color: "var(--color-text-primary)", fontSize: "0.875rem",
    fontWeight: 600, marginBottom: "2px",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  price: { color: "var(--color-primary)", fontSize: "0.9rem", fontWeight: 700 },
  unitPrice: { color: "var(--color-text-muted)", fontSize: "0.72rem" },
  controls: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)", padding: "3px",
  },
  qtyBtn: {
    width: "26px", height: "26px", borderRadius: "var(--radius-sm)",
    background: "transparent", border: "none",
    color: "var(--color-text-secondary)", fontSize: "1rem",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, transition: "all 150ms ease",
    lineHeight: 1,
  },
  qtyBtnPlus: { color: "var(--color-primary)" },
  qty: {
    minWidth: "20px", textAlign: "center",
    color: "var(--color-text-primary)", fontSize: "0.875rem", fontWeight: 600,
  },
  removeBtn: {
    background: "none", border: "none",
    cursor: "pointer", fontSize: "0.9rem",
    opacity: 0.5, transition: "opacity 150ms ease",
    padding: "4px", flexShrink: 0,
  },
};
