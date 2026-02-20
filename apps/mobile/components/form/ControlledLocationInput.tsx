import { formatLocationData } from "@hitchly/utils";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Alert } from "react-native";

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
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLocations = async (query: string): Promise<void> => {
    if (query.length < 4) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setIsSearching(false);
        return;
      }

      const geocoded = await Location.geocodeAsync(query);
      const topMatches = geocoded.slice(0, 3);

      const formatted = await Promise.all(
        topMatches.map(async (match, index) => {
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
        })
      );

      setResults(
        formatted.filter((item): item is LocationResult => item !== null)
      );
    } catch (error) {
      Alert.alert("Location Error", String(error));
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
          error={error?.message}
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
