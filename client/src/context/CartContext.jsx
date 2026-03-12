import { createContext, useContext, useState, useCallback, useMemo } from "react";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addItem = useCallback((menuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i._id === menuItem._id);
      if (existing) return prev.map((i) => i._id === menuItem._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...menuItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems((prev) => prev.filter((i) => i._id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity <= 0) { setItems((prev) => prev.filter((i) => i._id !== itemId)); return; }
    setItems((prev) => prev.map((i) => (i._id === itemId ? { ...i, quantity } : i)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((v) => !v), []);

  const { totalItems, totalAmount } = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        totalItems: acc.totalItems + item.quantity,
        totalAmount: acc.totalAmount + item.price * item.quantity,
      }),
      { totalItems: 0, totalAmount: 0 }
    );
  }, [items]);

  const getItemQuantity = useCallback(
    (itemId) => items.find((i) => i._id === itemId)?.quantity || 0,
    [items]
  );

  const getOrderPayload = useCallback(() => ({
    items: items.map((item) => ({
      menuItem: item._id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    totalAmount,
  }), [items, totalAmount]);

  return (
    <CartContext.Provider value={{
      items, isCartOpen, totalItems, totalAmount,
      addItem, removeItem, updateQuantity, clearCart,
      openCart, closeCart, toggleCart,
      getItemQuantity, getOrderPayload,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

export default CartContext;