// Define a generic shape that matches Expo's object but doesn't depend on the library
export interface GeocodedAddress {
  street?: string | null;
  streetNumber?: string | null;
  name?: string | null;
  city?: string | null;
  region?: string | null;
  isoCountryCode?: string | null;
}

export interface CampusDropoffOption {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export const MCMASTER_DROPOFF_OPTIONS: CampusDropoffOption[] = [
  {
    id: "thode-library",
    label: "Thode Library",
    lat: 43.2611011,
    lng: -79.9225905,
  },
  { id: "musc", label: "MUSC", lat: 43.26347, lng: -79.91781 },
  { id: "dbac", label: "DBAC", lat: 43.2652879, lng: -79.9158237 },
  {
    id: "mills-library",
    label: "Mills Library",
    lat: 43.26276,
    lng: -79.91764,
  },
  {
    id: "etb",
    label: "ETB (Engineering Technology Building)",
    lat: 43.25853,
    lng: -79.92003,
  },
  { id: "mdcl", label: "MDCL", lat: 43.26107, lng: -79.91686 },
  {
    id: "pgcll",
    label: "PGCLL (Peter George Centre for Living and Learning)",
    lat: 43.2654,
    lng: -79.9182642,
  },
];

/**
 * Formats a date or date string into a readable short format (e.g., "Oct 24, 02:30 PM").
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
    // If the last part is a country, skip it and look at the preceding parts
    const lastPart = parts[parts.length - 1]!;
    const isCountry =
      lastPart.toLowerCase() === "canada" ||
      lastPart.toLowerCase() === "usa" ||
      lastPart.toLowerCase() === "united states" ||
      lastPart === "CA" ||
      lastPart === "US";

    const baseIdx = isCountry ? parts.length - 2 : parts.length - 1;

    if (baseIdx >= 1) {
      const city = parts[baseIdx - 1];
      const province = parts[baseIdx]?.split(" ")[0];
      return `${city}, ${province}`;
    }

    return parts[baseIdx] || address;
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
/**
 * Shortens a full address to just the street line.
 * If the first part is a number (street number) and the next part exists,
 * it joins them to avoid truncating at the street number.
 */
export const shortenAddress = (address?: string | null): string => {
  if (!address) return "Location";
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length < 2) return parts[0] || "Location";

  const firstPart = parts[0]!;
  const secondPart = parts[1]!;

  // If first part is just a number, it's likely a street number
  if (
    !isNaN(Number(firstPart.replace(/[a-zA-Z]/g, ""))) &&
    firstPart.length < 10
  ) {
    return `${firstPart} ${secondPart}`;
  }

  return firstPart;
};

/**
 * Formats an address to show "Street, City" or "POI, City".
 * Example: "1280 Main St W, Hamilton, ON, Canada" -> "1280 Main St W, Hamilton"
 */
export const formatStreetCity = (address?: string | null): string => {
  if (!address) return "Location";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return parts[0] || "Location";

  const firstPart = parts[0]!;
  // Check if first part is just a number (street number)
  const isStreetNumber =
    !isNaN(Number(firstPart.replace(/[a-zA-Z]/g, ""))) && firstPart.length < 10;

  if (isStreetNumber && parts.length >= 3) {
    return `${parts[0]} ${parts[1]}, ${parts[2]}`;
  }

  return `${parts[0]}, ${parts[1]}`;
};

/**
 * Extracts only the city name from an address.
 * Example: "1280 Main St W, Hamilton, ON, Canada" -> "Hamilton"
 */
export const formatCity = (address?: string | null): string => {
  if (!address) return "Location";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "Location";
  if (parts.length === 1) return parts[0]!;

  // Identify Country
  const lastPart = parts[parts.length - 1]!;
  const isCountry =
    lastPart.toLowerCase() === "canada" ||
    lastPart.toLowerCase() === "usa" ||
    lastPart.toLowerCase() === "united states" ||
    lastPart === "CA" ||
    lastPart === "US";

  // Strip country if present to focus on City/Province
  const effectiveParts = isCountry ? parts.slice(0, -1) : parts;

  if (effectiveParts.length === 0) return parts[0]!;
  if (effectiveParts.length === 1) return effectiveParts[0]!;

  // Hierarchy is usually [..., City, Province]
  // The city is the one before the province
  return effectiveParts[effectiveParts.length - 2]!;
};
