import { useState, useEffect, useCallback } from "react";
import { menuAPI } from "../services/api";
import { useCart } from "../context/CartContext";
import RecommendationShelf from "../components/RecommendationShelf";
import toast from "react-hot-toast";
import RecommendationStrip from "../components/RecommendationStrip";

const CATEGORY_LABELS = {
  all:     { label: "All",      emoji: "🍽️" },
  burger:  { label: "Burgers",  emoji: "🍔" },
  pizza:   { label: "Pizza",    emoji: "🍕" },
  sides:   { label: "Sides",    emoji: "🍟" },
  drinks:  { label: "Drinks",   emoji: "🥤" },
  dessert: { label: "Desserts", emoji: "🍰" },
  salad:   { label: "Salads",   emoji: "🥗" },
};

const SORT_OPTIONS = [
  { value: "popular",    label: "Most Popular" },
  { value: "price-asc",  label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "rating",     label: "Top Rated" },
];

export default function Menu() {
  const { addItem, getItemQuantity, updateQuantity, removeItem, openCart } = useCart();

  const [items, setItems] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("popular");

  // ── Fetch menu items ────────────────────────────────────────────────────────
  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "all") params.set("category", activeCategory);
      if (search.trim()) params.set("search", search.trim());
      if (sort !== "popular") params.set("sort", sort);

      const { data } = await menuAPI.getAll(Object.fromEntries(params));

      // Client-side sort + search filter for snappy UI
      let filtered = data.items;

      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            i.tags.some((t) => t.toLowerCase().includes(q))
        );
      }

      if (sort === "price-asc")  filtered = [...filtered].sort((a, b) => a.price - b.price);
      if (sort === "price-desc") filtered = [...filtered].sort((a, b) => b.price - a.price);
      if (sort === "rating")     filtered = [...filtered].sort((a, b) => b.rating - a.rating);

      setItems(filtered);
      setCategoryCounts(data.categoryCounts || {});
    } catch (err) {
      toast.error("Failed to load menu. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search, sort]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  // ── Search debounce ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSearch("");
    setSearchInput("");
  };

  const handleAddToCart = (item) => {
    addItem(item);
    toast.success(`${item.name} added to cart!`, { duration: 1800 });
  };

  const handleCartOpen = () => openCart();

  return (
    <div style={styles.page}>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Our Menu</h1>
          <p style={styles.subtitle}>Fresh, made-to-order food delivered fast</p>
        </div>
        {/* Search + Sort */}
        <div style={styles.controls}>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search menu..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={styles.searchInput}
            />
            {searchInput && (
              <button
                style={styles.clearSearch}
                onClick={() => { setSearchInput(""); setSearch(""); }}
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={styles.sortSelect}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Category Tabs ─────────────────────────────────────────────────── */}
      <div style={styles.tabsWrap}>
        <div style={styles.tabs}>
          {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => {
            const count = categoryCounts[key] || 0;
            const isActive = activeCategory === key;
            if (key !== "all" && count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => handleCategoryChange(key)}
                style={{ ...styles.tab, ...(isActive ? styles.tabActive : {}) }}
              >
                <span style={styles.tabEmoji}>{emoji}</span>
                <span style={styles.tabLabel}>{label}</span>
                <span style={{ ...styles.tabCount, ...(isActive ? styles.tabCountActive : {}) }}>
                  {key === "all" ? categoryCounts.all || 0 : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Results Info ──────────────────────────────────────────────────── */}
      {!loading && (
        <div style={styles.resultsBar}>
          <span style={styles.resultsText}>
            {search ? (
              <>{items.length} result{items.length !== 1 ? "s" : ""} for "<strong style={{ color: "var(--color-text-primary)" }}>{search}</strong>"</>
            ) : (
              <>{items.length} item{items.length !== 1 ? "s" : ""} {activeCategory !== "all" ? `in ${CATEGORY_LABELS[activeCategory]?.label}` : ""}</>
            )}
          </span>
        </div>
      )}

      {/* ── Recommendations (shown only when no search/filter active) ── */}
      {!search && activeCategory === "all" && (
        <div style={{ marginBottom: "32px" }}>
          <RecommendationShelf mode="personal" maxItems={8} />
        </div>
      )}

      {/* ── Loading Skeleton ──────────────────────────────────────────────── */}
      {loading && (
        <div style={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────────────── */}
      {!loading && items.length === 0 && (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>🍽️</span>
          <h3 style={styles.emptyTitle}>No items found</h3>
          <p style={styles.emptyText}>
            {search ? `No results for "${search}". Try a different keyword.` : "No items available in this category."}
          </p>
          {search && (
            <button style={styles.clearBtn} onClick={() => { setSearch(""); setSearchInput(""); }}>
              Clear search
            </button>
          )}
        </div>
      )}

      {/* ── Menu Grid ─────────────────────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <div style={styles.grid}>
          {items.map((item) => (
            <MenuItemCard
              key={item._id}
              item={item}
              quantity={getItemQuantity(item._id)}
              onAdd={() => handleAddToCart(item)}
              onIncrease={() => { addItem(item); }}
              onDecrease={() => {
                const q = getItemQuantity(item._id);
                if (q <= 1) removeItem(item._id);
                else updateQuantity(item._id, q - 1);
              }}
              onOpenCart={handleCartOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Menu Item Card ────────────────────────────────────────────────────────────
function MenuItemCard({ item, quantity, onAdd, onIncrease, onDecrease }) {
  const [imgError, setImgError] = useState(false);

  const tagColors = {
    bestseller: { bg: "rgba(255,107,53,0.15)",  color: "var(--color-primary)" },
    new:        { bg: "rgba(76,175,130,0.15)",   color: "var(--color-success)" },
    spicy:      { bg: "rgba(229,80,74,0.15)",    color: "var(--color-error)"   },
    vegetarian: { bg: "rgba(76,175,130,0.15)",   color: "var(--color-success)" },
    popular:    { bg: "rgba(245,200,66,0.15)",   color: "var(--color-warning)" },
  };

  return (
    <div style={cardStyles.card}>
      {/* Image */}
      <div style={cardStyles.imgWrap}>
        {item.image && !imgError ? (
          <img
            src={item.image}
            alt={item.name}
            style={cardStyles.img}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div style={cardStyles.imgFallback}>
            {CATEGORY_LABELS[item.category]?.emoji || "🍽️"}
          </div>
        )}
        {/* Prep time badge */}
        <span style={cardStyles.prepBadge}>⏱ {item.preparationTime}m</span>
        {/* Tags */}
        {item.tags.slice(0, 2).map((tag) => {
          const style = tagColors[tag];
          if (!style) return null;
          return (
            <span key={tag} style={{ ...cardStyles.tag, background: style.bg, color: style.color }}>
              {tag}
            </span>
          );
        })}
      </div>

      {/* Content */}
      <div style={cardStyles.content}>
        <div style={cardStyles.topRow}>
          <h3 style={cardStyles.name}>{item.name}</h3>
          <div style={cardStyles.ratingRow}>
            <span style={cardStyles.star}>⭐</span>
            <span style={cardStyles.rating}>{item.rating.toFixed(1)}</span>
          </div>
        </div>

        <p style={cardStyles.description}>{item.description}</p>

        <div style={cardStyles.footer}>
          <span style={cardStyles.price}>${item.price.toFixed(2)}</span>

          {quantity === 0 ? (
            <button onClick={onAdd} style={cardStyles.addBtn}>
              + Add
            </button>
          ) : (
            <div style={cardStyles.qtyControls}>
              <button onClick={onDecrease} style={cardStyles.qtyBtn}>−</button>
              <span style={cardStyles.qtyNum}>{quantity}</span>
              <button onClick={onIncrease} style={{ ...cardStyles.qtyBtn, ...cardStyles.qtyBtnPlus }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ ...cardStyles.card, overflow: "hidden" }}>
      <div style={{ height: "180px", background: "var(--color-bg-elevated)" }} className="skeleton" />
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div className="skeleton" style={{ height: "18px", width: "70%", borderRadius: "4px" }} />
        <div className="skeleton" style={{ height: "13px", width: "100%", borderRadius: "4px" }} />
        <div className="skeleton" style={{ height: "13px", width: "80%", borderRadius: "4px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
          <div className="skeleton" style={{ height: "24px", width: "50px", borderRadius: "4px" }} />
          <div className="skeleton" style={{ height: "34px", width: "80px", borderRadius: "8px" }} />
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "calc(100vh - 64px)",
    background: "var(--color-bg)",
    padding: "0 0 60px 0",
  },
  header: {
    background: "linear-gradient(180deg, var(--color-bg-elevated) 0%, var(--color-bg) 100%)",
    borderBottom: "1px solid var(--color-border)",
    padding: "32px 24px 24px",
    display: "flex", alignItems: "flex-end",
    justifyContent: "space-between", gap: "24px",
    flexWrap: "wrap",
    maxWidth: "1200px", margin: "0 auto",
  },
  headerContent: {},
  title: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
    color: "var(--color-text-primary)", marginBottom: "6px",
  },
  subtitle: { color: "var(--color-text-muted)", fontSize: "0.95rem" },
  controls: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  searchWrap: {
    position: "relative", display: "flex", alignItems: "center",
    minWidth: "220px",
  },
  searchIcon: {
    position: "absolute", left: "12px", fontSize: "0.9rem",
    pointerEvents: "none",
  },
  searchInput: {
    paddingLeft: "36px", paddingRight: "36px",
    height: "40px", fontSize: "0.875rem",
    background: "var(--color-bg-input)",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-full)",
    color: "var(--color-text-primary)", outline: "none",
    width: "100%",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  },
  clearSearch: {
    position: "absolute", right: "10px",
    background: "none", border: "none",
    color: "var(--color-text-muted)", cursor: "pointer",
    fontSize: "0.75rem", padding: "4px",
  },
  sortSelect: {
    height: "40px", padding: "0 12px",
    fontSize: "0.875rem", minWidth: "170px",
    borderRadius: "var(--radius-full)",
  },
  tabsWrap: {
    maxWidth: "1200px", margin: "0 auto",
    padding: "20px 24px 0",
    overflowX: "auto",
  },
  tabs: { display: "flex", gap: "8px", paddingBottom: "4px" },
  tab: {
    display: "flex", alignItems: "center", gap: "7px",
    padding: "9px 16px", borderRadius: "var(--radius-full)",
    background: "var(--color-bg-elevated)",
    border: "1.5px solid var(--color-border)",
    color: "var(--color-text-secondary)", cursor: "pointer",
    whiteSpace: "nowrap", transition: "all 200ms ease",
    fontFamily: "var(--font-body)", fontWeight: 500,
    fontSize: "0.875rem",
  },
  tabActive: {
    background: "rgba(255,107,53,0.12)",
    borderColor: "var(--color-primary)",
    color: "var(--color-primary)",
  },
  tabEmoji: { fontSize: "1rem" },
  tabLabel: {},
  tabCount: {
    background: "var(--color-bg-card)", color: "var(--color-text-muted)",
    fontSize: "0.72rem", fontWeight: 600,
    padding: "1px 7px", borderRadius: "var(--radius-full)",
    minWidth: "22px", textAlign: "center",
  },
  tabCountActive: {
    background: "rgba(255,107,53,0.2)", color: "var(--color-primary)",
  },
  resultsBar: {
    maxWidth: "1200px", margin: "0 auto",
    padding: "16px 24px 0",
  },
  resultsText: { color: "var(--color-text-muted)", fontSize: "0.875rem" },
  grid: {
    maxWidth: "1200px", margin: "20px auto 0",
    padding: "0 24px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "20px",
  },
  emptyState: {
    maxWidth: "400px", margin: "80px auto",
    textAlign: "center", padding: "0 24px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
  },
  emptyIcon: { fontSize: "3.5rem" },
  emptyTitle: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: "1.3rem", color: "var(--color-text-primary)",
  },
  emptyText: { color: "var(--color-text-muted)", fontSize: "0.9rem" },
  clearBtn: {
    padding: "9px 20px", marginTop: "4px",
    background: "var(--color-primary)", color: "#fff",
    border: "none", borderRadius: "var(--radius-md)",
    fontWeight: 600, cursor: "pointer",
    fontFamily: "var(--font-display)", fontSize: "0.875rem",
  },
};

const cardStyles = {
  card: {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    display: "flex", flexDirection: "column",
    transition: "border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease",
    animation: "fadeIn 0.3s ease forwards",
  },
  imgWrap: {
    position: "relative", height: "180px",
    background: "var(--color-bg-elevated)",
    overflow: "hidden", flexShrink: 0,
  },
  img: {
    width: "100%", height: "100%", objectFit: "cover",
    transition: "transform 300ms ease",
  },
  imgFallback: {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "3.5rem", background: "var(--color-bg-elevated)",
  },
  prepBadge: {
    position: "absolute", bottom: "8px", right: "8px",
    background: "rgba(15,15,15,0.82)", color: "var(--color-text-secondary)",
    fontSize: "0.72rem", fontWeight: 600,
    padding: "3px 8px", borderRadius: "var(--radius-full)",
    backdropFilter: "blur(4px)",
  },
  tag: {
    position: "absolute", top: "8px", left: "8px",
    fontSize: "0.68rem", fontWeight: 700,
    padding: "3px 8px", borderRadius: "var(--radius-full)",
    textTransform: "capitalize", letterSpacing: "0.03em",
  },
  content: { padding: "16px", display: "flex", flexDirection: "column", flex: 1, gap: "8px" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" },
  name: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: "1rem", color: "var(--color-text-primary)",
    lineHeight: 1.25, flex: 1,
  },
  ratingRow: { display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 },
  star: { fontSize: "0.8rem" },
  rating: { color: "var(--color-text-secondary)", fontSize: "0.8rem", fontWeight: 600 },
  description: {
    color: "var(--color-text-muted)", fontSize: "0.8rem",
    lineHeight: 1.5, flex: 1,
    display: "-webkit-box", WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  footer: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginTop: "auto", paddingTop: "8px",
  },
  price: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: "1.1rem", color: "var(--color-text-primary)",
  },
  addBtn: {
    padding: "8px 18px",
    background: "var(--color-primary)", color: "#fff",
    border: "none", borderRadius: "var(--radius-md)",
    fontWeight: 700, cursor: "pointer",
    fontFamily: "var(--font-display)", fontSize: "0.875rem",
    transition: "all 150ms ease",
    letterSpacing: "0.02em",
  },
  qtyControls: {
    display: "flex", alignItems: "center", gap: "10px",
    background: "var(--color-bg-elevated)",
    border: "1.5px solid var(--color-primary)",
    borderRadius: "var(--radius-md)", padding: "4px 8px",
  },
  qtyBtn: {
    background: "none", border: "none",
    color: "var(--color-text-secondary)", fontSize: "1.1rem",
    cursor: "pointer", fontWeight: 700,
    padding: "0 2px", lineHeight: 1,
    transition: "color 150ms ease",
  },
  qtyBtnPlus: { color: "var(--color-primary)" },
  qtyNum: {
    color: "var(--color-text-primary)", fontWeight: 700,
    fontSize: "0.9rem", minWidth: "18px", textAlign: "center",
  },
};
