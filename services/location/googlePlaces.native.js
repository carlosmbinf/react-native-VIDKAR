import Constants from "expo-constants";

const API_KEY = String(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    Constants.expoConfig?.extra?.googlePlacesApiKey ||
    "",
).trim();
const API_BASE_URL = "https://places.googleapis.com/v1";

const ensureApiKey = () => {
  if (!API_KEY) {
    throw new Error("La búsqueda de direcciones no está configurada.");
  }
};

const getPlaceComponent = (components, type) =>
  components?.find((component) => component.types?.includes(type));

const getComponentText = (component) =>
  component?.longText || component?.shortText || "";

const readApiError = async (response) => {
  const body = await response.json().catch(() => null);
  return body?.error?.message || `Google Places respondió ${response.status}.`;
};

export const searchGoogleAddresses = async (input, sessionToken, signal) => {
  ensureApiKey();

  const response = await fetch(`${API_BASE_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({ input, languageCode: "es", sessionToken }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const result = await response.json();
  return (result?.suggestions || [])
    .map((suggestion) => suggestion?.placePrediction)
    .filter((prediction) => prediction?.placeId)
    .map((prediction) => ({
      placeId: prediction.placeId,
      text: prediction.text?.text || "",
      mainText:
        prediction.structuredFormat?.mainText?.text ||
        prediction.text?.text ||
        "",
      secondaryText: prediction.structuredFormat?.secondaryText?.text || "",
    }));
};

export const getGoogleAddressDetails = async (placeId, sessionToken) => {
  ensureApiKey();

  const url = new URL(`${API_BASE_URL}/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("sessionToken", sessionToken);

  const response = await fetch(url.toString(), {
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "formattedAddress,location,addressComponents",
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const place = await response.json();
  const latitude = Number(place?.location?.latitude);
  const longitude = Number(place?.location?.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("La dirección no tiene una ubicación precisa.");
  }

  const route = getPlaceComponent(place.addressComponents, "route");
  const streetNumber = getPlaceComponent(
    place.addressComponents,
    "street_number",
  );
  const apartment = getPlaceComponent(place.addressComponents, "subpremise");

  return {
    address: place.formattedAddress || "",
    houseNumber: [getComponentText(streetNumber), getComponentText(apartment)]
      .filter(Boolean)
      .join(", "),
    point: { latitude, longitude },
    street: getComponentText(route) || place.formattedAddress || "",
  };
};