/**
 * Entrance IDs last for one screen instance: refreshes and focus changes do
 * not replay them; a genuine screen remount gets a new coordinator.
 */
export function createGenieCoordinator() {
  const seen = new Set();
  const cancellations = new Set();
  let capturing = 0;
  return {
    seen,
    register(cancel) {
      cancellations.add(cancel);
      return () => cancellations.delete(cancel);
    },
    cancelAll() { cancellations.forEach((cancel) => cancel()); },
    acquire() {
      // Two in-flight snapshots cap temporary image and bridge memory.
      if (capturing >= 2) return false;
      capturing += 1;
      return true;
    },
    release() { capturing = Math.max(0, capturing - 1); },
  };
}
