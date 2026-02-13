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

/**
 * Formats a full address string to show just "City, Province" for cleaner display in trip summaries.
 * If the address is missing or can't be parsed, it returns "Location".
 */
export const formatCityProvince = (address?: string | null) => {
  if (!address) return "Location";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const city = parts[parts.length - 2];
    const province =
      parts[parts.length - 1]?.split(" ")[0] || parts[parts.length - 1];
    return `${city}, ${province}`;
  }
  return address;
};

/**
 * Formats a number into its ordinal form (e.g., 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th", etc.)
 * Handles special cases for 11th, 12th, and 13th correctly.
 * If the input is not a valid number, it returns the input as-is.
 */
export const formatOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const idx = (v - 20) % 10;
  const suffix =
    idx >= 1 && idx <= 3 && s[idx] !== undefined
      ? s[idx]
      : s[v] !== undefined
        ? s[v]
        : (s[0] ?? "th");
  return n + (suffix ?? "th");
};

/**
 * Formats a number of cents into a currency string (e.g., 1234 → "$12.34").
 */
export const formatCurrency = (cents: number | null | undefined): string => {
  if (cents == null) return "TBD";
  return `$${(cents / 100).toFixed(2)}`;
};

/**
 * Formats a duration given in minutes into a human-readable string (e.g., 90 → "1 hr 30 min").
 */
export const formatDuration = (minutes: number | null | undefined): string => {
  if (minutes == null) return "TBD";

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h <= 0) return `${m} min`;
  return `${h} hr ${m} min`;
};
