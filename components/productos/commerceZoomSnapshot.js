const MAX_AGE_MS = 5000;
let pendingSnapshot = null;
let expiryTimer = null;

export function saveCommerceZoomSnapshot(productId, visual) {
  if (expiryTimer) clearTimeout(expiryTimer);
  pendingSnapshot = null;
  expiryTimer = null;
  if (typeof productId !== "string" || !productId) return;

  const snapshot = { productId, visual, createdAt: Date.now() };
  pendingSnapshot = snapshot;
  expiryTimer = setTimeout(() => {
    if (pendingSnapshot === snapshot) {
      pendingSnapshot = null;
      expiryTimer = null;
    }
  }, MAX_AGE_MS);
}

export function getCommerceZoomSnapshot(productId) {
  if (!pendingSnapshot || pendingSnapshot.productId !== productId) return null;
  const age = Date.now() - pendingSnapshot.createdAt;
  return age >= 0 && age <= MAX_AGE_MS ? pendingSnapshot : null;
}

export function clearCommerceZoomSnapshot(snapshot) {
  if (!snapshot || snapshot !== pendingSnapshot) return;
  clearTimeout(expiryTimer);
  pendingSnapshot = null;
  expiryTimer = null;
}
