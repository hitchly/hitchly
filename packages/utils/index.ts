// Define a generic shape that matches Expo's object but doesn't depend on the library
export interface GeocodedAddress {
  street?: string | null;
  streetNumber?: string | null;
  name?: string | null;
  city?: string | null;
  region?: string | null;
  isoCountryCode?: string | null;
}

/**
 * Formats a raw address object into a clean title/subtitle format.
 * Useful for search dropdowns or address displays.
 */
export const formatLocationData = (
  loc: GeocodedAddress
): { title: string; subtitle: string; full: string } | null => {
  let streetLine = loc.street || "";
  const streetNumber =
    loc.streetNumber || (loc.name && !isNaN(Number(loc.name)) ? loc.name : "");

  if (streetNumber && !streetLine.startsWith(streetNumber)) {
    streetLine = `${streetNumber} ${streetLine}`;
  }

  streetLine = streetLine.trim();
  if (!streetLine) return null;

  const regionParts = [loc.city, loc.region, loc.isoCountryCode].filter(
    Boolean
  );
  const regionLine = regionParts.join(", ");

  // Determine if it's a Point of Interest (POI)
  const isPOI =
    loc.name &&
    isNaN(Number(loc.name)) &&
    loc.name !== loc.street &&
    loc.name !== streetLine;

  let title = "";
  let subtitle = "";

  if (isPOI) {
    title = loc.name!;
    subtitle = `${streetLine}, ${regionLine}`;
  } else {
    title = streetLine;
    subtitle = regionLine;
  }

  const full = isPOI ? `${title}, ${subtitle}` : `${title}, ${regionLine}`;
  return { title, subtitle, full };
};

/**
 * Formats latitude/longitude into a readable string (e.g., "43.2345° N")
 */
export const formatCoordinate = (val: number, type: "lat" | "long"): string => {
  const dir = type === "lat" ? (val > 0 ? "N" : "S") : val > 0 ? "E" : "W";
  return `${Math.abs(val).toFixed(4)}° ${dir}`;
};

/**
 * Combines lat/long into a single display string
 */
export const formatCoordinatePair = (lat: number, long: number): string => {
  return `${formatCoordinate(lat, "lat")}, ${formatCoordinate(long, "long")}`;
};
