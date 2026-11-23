import { VidkarMCP } from "../../modules/vidkar-mcp/src";
import { syncCourseSpotlightIndex } from "../spotlight/spotlight";

let lastSyncedVisibility = null;
let syncQueue = Promise.resolve();

export const syncIosCourseVisibility = (enabled) => {
  syncQueue = syncQueue.catch(() => undefined).then(async () => {
    if (lastSyncedVisibility === enabled) return;
    if (typeof VidkarMCP?.setCourseCatalogVisibility !== "function") {
      throw new Error("El módulo nativo de VIDKAR no puede actualizar la visibilidad de cursos.");
    }

    await VidkarMCP.setCourseCatalogVisibility(enabled);
    if (!enabled) await syncCourseSpotlightIndex([]);
    lastSyncedVisibility = enabled;
  });

  return syncQueue;
};
