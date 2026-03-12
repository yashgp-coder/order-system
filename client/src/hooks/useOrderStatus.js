import { useState, useEffect, useCallback } from "react";
import { useSocket } from "../context/SocketContext";

/**
 * useOrderStatus
 *
 * Subscribes to real-time status updates for a specific order.
 * Optionally accepts initial values from a pre-fetched order object.
 *
 * @param {string}  orderId       - The order _id to watch
 * @param {object}  initialOrder  - Pre-fetched order object (optional)
 * @returns {{ status, queuePosition, estimatedTime, statusHistory, lastUpdated }}
 */
export const useOrderStatus = (orderId, initialOrder = null) => {
  const { on } = useSocket();

  const [status, setStatus]               = useState(initialOrder?.status        || null);
  const [queuePosition, setQueuePosition] = useState(initialOrder?.queuePosition || null);
  const [estimatedTime, setEstimatedTime] = useState(initialOrder?.estimatedTime || null);
  const [statusHistory, setStatusHistory] = useState(initialOrder?.statusHistory || []);
  const [lastUpdated, setLastUpdated]     = useState(null);

  // Sync when the initial order object changes (e.g. after first fetch)
  useEffect(() => {
    if (initialOrder) {
      setStatus(initialOrder.status);
      setQueuePosition(initialOrder.queuePosition ?? null);
      setEstimatedTime(initialOrder.estimatedTime ?? null);
      setStatusHistory(initialOrder.statusHistory ?? []);
    }
  }, [initialOrder?._id, initialOrder?.status]);

  // Listen for status updates on this specific order
  useEffect(() => {
    if (!orderId) return;

    const cleanup = on("order:statusUpdated", ({ order }) => {
      if (order._id !== orderId) return; // Not our order

      setStatus(order.status);
      setQueuePosition(order.queuePosition ?? null);
      setEstimatedTime(order.estimatedTime ?? null);
      if (order.statusHistory) setStatusHistory(order.statusHistory);
      setLastUpdated(new Date());
    });

    return cleanup;
  }, [on, orderId]);

  return { status, queuePosition, estimatedTime, statusHistory, lastUpdated };
};

/**
 * useQueueUpdates
 *
 * Subscribes to real-time kitchen queue broadcasts.
 * Used by the admin dashboard queue visualization.
 *
 * @param {Array} initialQueue - Pre-fetched queue array (optional)
 * @returns {{ queue, lastUpdated }}
 */
export const useQueueUpdates = (initialQueue = []) => {
  const { on } = useSocket();
  const [queue, setQueue]           = useState(initialQueue);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const cleanup = on("queue:updated", (queueData) => {
      setQueue(queueData);
      setLastUpdated(new Date());
    });
    return cleanup;
  }, [on]);

  return { queue, lastUpdated };
};

/**
 * useNewOrders
 *
 * Subscribes to new order placement events (admin only).
 * Calls onNewOrder(order) whenever a new order comes in.
 *
 * @param {function} onNewOrder - Callback fired with the new order object
 */
export const useNewOrders = (onNewOrder) => {
  const { on } = useSocket();

  const stableCallback = useCallback(onNewOrder, []);

  useEffect(() => {
    const cleanup = on("order:placed", ({ order }) => {
      stableCallback(order);
    });
    return cleanup;
  }, [on, stableCallback]);
};
