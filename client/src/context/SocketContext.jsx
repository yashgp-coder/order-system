import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  // ── Pending listeners: registered before socket is ready ─────────────────
  // Stores { event, handler } so we can attach them once socket connects
  const pendingListeners = useRef([]);

  // ── Initialize Socket on Auth ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://order-system-sand.vercel.app";
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on("connect", () => {
      console.log("🔌 Socket connected:", newSocket.id);
      setConnected(true);

      // Join room
      if (user.role === "admin") {
        newSocket.emit("join:admin");
      } else {
        newSocket.emit("join:user", user._id);
      }

      // Flush pending listeners now that socket is live
      pendingListeners.current.forEach(({ event, handler }) => {
        newSocket.on(event, handler);
      });
    });

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setConnected(false);
    });

    newSocket.on("reconnect", (attemptNumber) => {
      console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
      setConnected(true);

      // Re-join room after reconnect
      if (user.role === "admin") {
        newSocket.emit("join:admin");
      } else {
        newSocket.emit("join:user", user._id);
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      pendingListeners.current = [];
    };
  }, [isAuthenticated, user?._id, user?.role]);

  // ── Subscribe to a socket event ───────────────────────────────────────────
  // Returns a cleanup function. Safe to call before socket is ready.
  const on = useCallback((event, handler) => {
    const sock = socketRef.current;

    if (sock) {
      // Socket exists — attach directly
      sock.on(event, handler);
      return () => sock.off(event, handler);
    } else {
      // Socket not yet ready — queue the listener
      const entry = { event, handler };
      pendingListeners.current.push(entry);

      // Return cleanup that removes from both pending and the eventual socket
      return () => {
        pendingListeners.current = pendingListeners.current.filter((e) => e !== entry);
        socketRef.current?.off(event, handler);
      };
    }
  }, []); // No deps — reads refs directly so it never goes stale

  // ── Emit a socket event ───────────────────────────────────────────────────
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, on, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within a SocketProvider");
  return context;
};

export default SocketContext;
