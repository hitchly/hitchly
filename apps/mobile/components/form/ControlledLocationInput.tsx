import { formatLocationData } from "@hitchly/utils";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";
import { Alert } from "react-native";

import type { LocationResult } from "@/components/ui/LocationInput";
import { LocationInput } from "@/components/ui/LocationInput";

interface ControlledLocationInputProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  placeholder?: string;
  onLocationSelected?: (lat: number, lng: number) => void;
}

export function ControlledLocationInput<T extends FieldValues>({
  name,
  label,
  placeholder,
  onLocationSelected,
}: ControlledLocationInputProps<T>) {
  const { control } = useFormContext<T>();
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

          // Fix: Proper null check for fmt and string conversion for template literal
          if (!fmt) return null;

          return {
            id: `${match.latitude.toString()}-${index.toString()}`,
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
      Alert.alert(String(error));
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
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }

            searchTimeoutRef.current = setTimeout(() => {
              // Fix: Wrapped in a self-invoking function or voided to handle promise correctly
              void fetchLocations(text);
            }, 600);
          }}
          onSelect={(item) => {
            onChange(item.fullAddress);
            setResults([]);
            onLocationSelected?.(item.latitude, item.longitude);
          }}
        />
      )}
    />
  );
}
