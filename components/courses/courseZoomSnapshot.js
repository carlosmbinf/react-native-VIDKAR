const MAX_AGE_MS = 5000;
let pendingSnapshot = null;
let expiryTimer = null;

export function saveCourseZoomSnapshot(courseId, visual) {
  if (expiryTimer) clearTimeout(expiryTimer);
  pendingSnapshot = null;
  expiryTimer = null;
  if (typeof courseId !== "string" || !courseId) return;

  const snapshot = { courseId, visual, createdAt: Date.now() };
  pendingSnapshot = snapshot;
  expiryTimer = setTimeout(() => {
    if (pendingSnapshot === snapshot) {
      pendingSnapshot = null;
      expiryTimer = null;
    }
  }, MAX_AGE_MS);
}

export function getCourseZoomSnapshot(courseId) {
  if (!pendingSnapshot || pendingSnapshot.courseId !== courseId) return null;
  const age = Date.now() - pendingSnapshot.createdAt;
  return age >= 0 && age <= MAX_AGE_MS ? pendingSnapshot : null;
}

export function clearCourseZoomSnapshot(snapshot) {
  if (!snapshot || snapshot !== pendingSnapshot) return;
  clearTimeout(expiryTimer);
  pendingSnapshot = null;
  expiryTimer = null;
}
