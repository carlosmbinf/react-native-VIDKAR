import MeteorBase from "@meteorrn/core";

const EVIDENCE_IMAGE_BASE_URL = "https://www.vidkar.com";
const EVIDENCE_IMAGE_URL_CACHE = new Map();
const TOKEN_REFRESH_MARGIN_MS = 30 * 1000;

export const buildMeteorHttpBaseUrl = () => {
  return EVIDENCE_IMAGE_BASE_URL;
};

export const buildEvidenceImageUrl = (evidenceId, token) => {
  if (!evidenceId || !token) {
    return null;
  }

  const httpBaseUrl = buildMeteorHttpBaseUrl();

  return httpBaseUrl
    ? `${httpBaseUrl}/evidencias/imagen/${encodeURIComponent(
        evidenceId,
      )}?token=${encodeURIComponent(token)}`
    : null;
};

export const requestEvidenceImageUrl = (evidenceId) => {
  if (!evidenceId) {
    return Promise.resolve(null);
  }

  const cached = EVIDENCE_IMAGE_URL_CACHE.get(evidenceId);
  if (cached && cached.expiresAt > Date.now() + TOKEN_REFRESH_MARGIN_MS) {
    return Promise.resolve(cached.imageUrl);
  }

  return new Promise((resolve, reject) => {
    MeteorBase.call(
      "evidencias.obtenerImagenUrl",
      evidenceId,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        const imageUrl = result?.imageUrl || null;
        if (imageUrl) {
          EVIDENCE_IMAGE_URL_CACHE.set(evidenceId, {
            expiresAt: Number(result.expiresAt) || Date.now(),
            imageUrl,
          });
        }
        resolve(imageUrl);
      },
    );
  });
};

export const requestEvidenceImageUrls = async (evidenceIds) => {
  const ids = [
    ...new Set(
      (Array.isArray(evidenceIds) ? evidenceIds : []).filter(Boolean),
    ),
  ];
  const entries = await Promise.all(
    ids.map(async (evidenceId) => {
      try {
        return [evidenceId, await requestEvidenceImageUrl(evidenceId)];
      } catch {
        return [evidenceId, null];
      }
    }),
  );

  return Object.fromEntries(entries.filter(([, imageUrl]) => imageUrl));
};
