export const shouldHideCommerceHomeSection = ({
  hasLocation,
  isLoading,
  locationError,
  locationUnavailable,
  query,
  searchStatus,
  storeCount,
}) => Boolean(
  searchStatus === "success"
  && hasLocation
  && !isLoading
  && !locationUnavailable
  && !locationError
  && !String(query || "").trim()
  && storeCount === 0
);
