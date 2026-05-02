const EVIDENCE_IMAGE_BASE_URL = "https://www.vidkar.com";

export const buildMeteorHttpBaseUrl = () => {
  return EVIDENCE_IMAGE_BASE_URL;
};

export const buildEvidenceImageUrl = (evidenceId) => {
  if (!evidenceId) {
    return null;
  }

  const httpBaseUrl = buildMeteorHttpBaseUrl();

  return httpBaseUrl
    ? `${httpBaseUrl}/evidencias/imagen/${encodeURIComponent(evidenceId)}`
    : null;
};
