export type VidkarSpotlightItem = {
  id: string;
  title: string;
  domainIdentifier: string;
  description?: string;
  metadata?: {
    contentType?: string;
    keywords?: string[];
    rankingHint?: number;
  };
};