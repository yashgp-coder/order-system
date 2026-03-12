import { useState, useEffect, useRef } from "react";
import { recommendAPI } from "../services/api";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";

// ── Source label config ───────────────────────────────────────────────────────
const SOURCE_CONFIG = {
  personalized:  { label: "✨ Recommended for you",      color: "var(--color-primary)" },
  "co-occurrence":{ label: "🧑‍🤝‍🧑 Customers also ordered", color: "var(--color-info)"    },
  trending:      { label: "🔥 Trending right now",        color: "var(--color-warning)"  },
};

const TAG_COLORS = {
  bestseller: { bg: "rgba(255,107,53,0.15)", color: "#FF6B35" },
  spicy:      { bg: "rgba(229,80,74,0.15)",  color: "#E5504A" },
  new:        { bg: "rgba(76,175,130,0.15)", color: "#4CAF82" },
  vegetarian: { bg: "rgba(76,175,130,0.15)", color: "#4CAF82" },
  popular:    { bg: "rgba(245,200,66,0.15)", color: "#F5C842" },
};

// ─────────────────────────────────────────────────────────────────────────────
// RecommendationShelf
//
// Props:
//   mode        "personal" | "similar" | "trending"
//   itemIds     string[] — required for mode="similar" (cart item IDs)
//   title       override default source label
//   maxItems    default 8
// ─────────────────────────────────────────────────────────────────────────────
export default function RecommendationShelf({ mode = "personal", itemIds = [], title, maxItems = 8 }) {
  const { addItem, getItemQuantity } = useCart();
  const [items, setItems]   = useState([]);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // ── Fetch recommendations ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        let res;
        if (mode === "similar") {
          if (itemIds.length === 0) { setItems([]); setLoading(false); return; }
          res = await recommendAPI.getSimilar(itemIds);
        } else if (mode === "trending") {
          res = await recommendAPI.getTrending();
        } else {
          res = await recommendAPI.getPersonal();
        }
        if (!cancelled) {
          setItems(res.data.items.slice(0, maxItems));
          setSource(res.data.source);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [mode, itemIds.join(","), maxItems]);

  // ── Scroll arrows ────────────────────────────────────────────────────────
  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => { el.removeEventListener("scroll", checkScroll); window.removeEventListener("resize", checkScroll); };
  }, [items]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  // ── Don't render if nothing to show ─────────────────────────────────────
  if (!loading && items.length === 0) return null;

  const srcCfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.trending;
  const displayTitle = title || srcCfg.label;

  return (
    <div style={styles.wrap}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={{ ...styles.shelfTitle, color: srcCfg.color }}>{displayTitle}</h3>
          {source === "personalized" && (
            <span style={styles.personalTag}>Based on your orders</span>
          )}
        </div>
        <div style={styles.scrollBtns}>
          <button
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            style={{ ...styles.scrollBtn, opacity: canScrollLeft ? 1 : 0.3 }}
            aria-label="Scroll left"
          >‹</button>
          <button
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            style={{ ...styles.scrollBtn, opacity: canScrollRight ? 1 : 0.3 }}
            aria-label="Scroll right"
          >›</button>
        </div>
      </div>

      {/* Scrollable shelf */}
      <div style={styles.shelfOuter}>
        {/* Left fade gradient */}
        {canScrollLeft  && <div style={{ ...styles.fadeEdge, ...styles.fadeLeft  }} />}
        {/* Right fade gradient */}
        {canScrollRight && <div style={{ ...styles.fadeEdge, ...styles.fadeRight }} />}

        <div ref={scrollRef} style={styles.shelf}>
          {loading
            ? [...Array(5)].map((_, i) => <RecommendSkeleton key={i} />)
            : items.map((item) => (
                <RecommendCard
                  key={item._id}
                  item={item}
                  qty={getItemQuantity(item._id)}
                  onAdd={() => {
                    addItem(item);
                    toast.success(`${item.name} added to cart!`);
                  }}
                />
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Recommend Card ────────────────────────────────────────────────────────────
function RecommendCard({ item, qty, onAdd }) {
  const primaryTag = item.tags?.find((t) => TAG_COLORS[t]);
  const tagCfg     = primaryTag ? TAG_COLORS[primaryTag] : null;

  return (
    <div style={cardStyles.card}>
      {/* Image */}
      <div style={cardStyles.imgWrap}>
        {item.image
          ? <img src={item.image} alt={item.name} style={cardStyles.img} />
          : <div style={cardStyles.imgFallback}>{CATEGORY_EMOJI[item.category] || "🍔"}</div>
        }
        {/* Tag badge on image */}
        {tagCfg && (
          <span style={{ ...cardStyles.tagBadge, background: tagCfg.bg, color: tagCfg.color }}>
            {primaryTag}
          </span>
        )}
        {qty > 0 && <div style={cardStyles.inCartBadge}>{qty} in cart</div>}
      </div>

      {/* Info */}
      <div style={cardStyles.body}>
        <p style={cardStyles.name} title={item.name}>{item.name}</p>
        <div style={cardStyles.meta}>
          <span style={cardStyles.price}>${item.price.toFixed(2)}</span>
          {item.rating > 0 && (
            <span style={cardStyles.rating}>⭐ {item.rating.toFixed(1)}</span>
          )}
        </div>
        <button
          onClick={onAdd}
          style={{ ...cardStyles.addBtn, ...(qty > 0 ? cardStyles.addBtnActive : {}) }}
        >
          {qty > 0 ? `+ Add another` : `+ Add to cart`}
        </button>
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function RecommendSkeleton() {
  return (
    <div style={{ ...cardStyles.card, pointerEvents: "none" }}>
      <div className="skeleton" style={{ width: "180px", height: "120px", borderRadius: "var(--radius-md)", flexShrink: 0 }} />
      <div style={cardStyles.body}>
        <div className="skeleton" style={{ height: "14px", width: "120px", borderRadius: "4px", marginBottom: "8px" }} />
        <div className="skeleton" style={{ height: "12px", width: "60px",  borderRadius: "4px", marginBottom: "12px" }} />
        <div className="skeleton" style={{ height: "32px", width: "100%", borderRadius: "8px" }} />
      </div>
    </div>
  );
}

// ── Emoji by category ─────────────────────────────────────────────────────────
const CATEGORY_EMOJI = {
  burger:  "🍔",
  pizza:   "🍕",
  sides:   "🍟",
  drinks:  "🥤",
  dessert: "🍰",
  salad:   "🥗",
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrap: { width: "100%", marginBottom: "8px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingLeft: "2px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  shelfTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", margin: 0 },
  personalTag: { background: "rgba(255,107,53,0.1)", color: "var(--color-primary)", fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "var(--radius-full)", border: "1px solid rgba(255,107,53,0.25)" },
  scrollBtns: { display: "flex", gap: "4px" },
  scrollBtn: { width: "30px", height: "30px", borderRadius: "50%", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 150ms ease", fontFamily: "var(--font-body)" },
  shelfOuter: { position: "relative" },
  shelf: { display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px", scrollbarWidth: "none", msOverflowStyle: "none" },
  fadeEdge: { position: "absolute", top: 0, bottom: "8px", width: "40px", zIndex: 2, pointerEvents: "none" },
  fadeLeft:  { left: 0,  background: "linear-gradient(90deg, var(--color-bg), transparent)" },
  fadeRight: { right: 0, background: "linear-gradient(-90deg, var(--color-bg), transparent)" },
};

const cardStyles = {
  card: { flexShrink: 0, width: "180px", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", display: "flex", flexDirection: "column", transition: "border-color 150ms ease, transform 150ms ease", cursor: "default", animation: "fadeIn 0.3s ease forwards" },
  imgWrap: { position: "relative", width: "100%", height: "110px", overflow: "hidden", background: "var(--color-bg-elevated)", flexShrink: 0 },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  imgFallback: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem" },
  tagBadge: { position: "absolute", top: "7px", left: "7px", fontSize: "0.62rem", fontWeight: 700, padding: "2px 7px", borderRadius: "var(--radius-full)", textTransform: "capitalize" },
  inCartBadge: { position: "absolute", top: "7px", right: "7px", background: "var(--color-primary)", color: "#fff", fontSize: "0.62rem", fontWeight: 700, padding: "2px 7px", borderRadius: "var(--radius-full)" },
  body: { padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
  name: { color: "var(--color-text-primary)", fontWeight: 600, fontSize: "0.82rem", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  meta: { display: "flex", alignItems: "center", gap: "8px" },
  price: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "var(--color-primary)" },
  rating: { color: "var(--color-text-muted)", fontSize: "0.72rem" },
  addBtn: { marginTop: "auto", padding: "7px 0", width: "100%", background: "rgba(255,107,53,0.1)", color: "var(--color-primary)", border: "1px solid rgba(255,107,53,0.25)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", transition: "all 150ms ease" },
  addBtnActive: { background: "rgba(255,107,53,0.18)", borderColor: "rgba(255,107,53,0.5)" },
};
