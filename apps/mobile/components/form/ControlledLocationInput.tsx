import { formatLocationData } from "@hitchly/utils";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";

import type { LocationResult } from "@/components/ui/LocationInput";
import { LocationInput } from "@/components/ui/LocationInput";

interface ControlledLocationInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  onTextChange?: () => void;
  onSelect?: (details: { lat: number; long: number }) => void;
}

export function ControlledLocationInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  onTextChange,
  onSelect,
}: ControlledLocationInputProps<T>) {
  const [results, setResults] = useState<readonly LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLocations = async (query: string, attempt = 1): Promise<void> => {
    if (query.length < 4) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const maxAttempts = 3;
    setIsSearching(true);
    setSearchError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setIsSearching(false);
        setSearchError("Location permission required for search");
        return;
      }

      let geocoded;
      try {
        geocoded = await Location.geocodeAsync(query);
      } catch (e) {
        const errorMsg = String(e);

        const isTimeout =
          errorMsg.includes("TimeoutException") ||
          errorMsg.includes("IOException");

        if (isTimeout && attempt < maxAttempts) {
          // Increase delay between retries to give system more time
          const delay = 1500 * attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          await fetchLocations(query, attempt + 1);
          return;
        }
        throw e;
      }

      const topMatches = geocoded.slice(0, 3);

      const formatted = await Promise.all(
        topMatches.map(async (match, index) => {
          try {
            const [reverse] = await Location.reverseGeocodeAsync({
              latitude: match.latitude,
              longitude: match.longitude,
            });

            if (!reverse) return null;

            const fmt = formatLocationData(reverse);
            if (!fmt) return null;

            return {
              id: `${String(match.latitude)}-${String(index)}`,
              title: fmt.title,
              subtitle: fmt.subtitle,
              fullAddress: fmt.full,
              latitude: match.latitude,
              longitude: match.longitude,
            };
          } catch {
            return null;
          }
        })
      );

      const validResults = formatted.filter(
        (item): item is LocationResult => item !== null
      );
      setResults(validResults);

      if (validResults.length === 0 && query.length >= 4) {
        setSearchError("No matching addresses found");
      }
    } catch (error) {
      const errorMsg = String(error);
      if (
        errorMsg.includes("TimeoutException") ||
        errorMsg.includes("IOException")
      ) {
        setSearchError(
          "Geocoder stalled. Please restart your phone if this persists."
        );
      } else {
        setSearchError("Could not look up address");
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <LocationInput
          label={label}
          placeholder={placeholder}
          error={error?.message ?? searchError ?? undefined}
          value={typeof value === "string" ? value : ""}
          isSearching={isSearching}
          results={results}
          onChangeText={(text) => {
            onChange(text);
            onTextChange?.();

            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }

            searchTimeoutRef.current = setTimeout(() => {
              void fetchLocations(text);
            }, 600);
          }}
          onSelect={(item) => {
            onChange(item.fullAddress);
            setResults([]);
            onSelect?.({ lat: item.latitude, long: item.longitude });
          }}
        />
      )}
    />
  );
}
