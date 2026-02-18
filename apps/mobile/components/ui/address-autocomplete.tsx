// TODOL Fix eslint errors in this file and re-enable linting
/* eslint-disable */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect?: (address: string) => void;
  placeholder?: string;
  error?: string;
  style?: any;
}

// Mock suggestions - Limited to Ontario, Canada
// In production, replace with actual geocoding API and add location filter:
// - Google Places API: use `components: ['administrative_area_level_1:ON', 'country:CA']`
// - Mapbox: use `country=CA&proximity=-79.3832,43.6532` (Toronto coordinates) with region filter
// - OpenStreetMap Nominatim: use `countrycodes=ca&bounded=1&viewbox=...` (Ontario bounding box)
const getSuggestions = (query: string): string[] => {
  if (!query || query.length < 2) return [];

  // All addresses are in Ontario, Canada
  const mockAddresses = [
    // Hamilton, ON
    "1280 Main St W, Hamilton, ON, Canada",
    "1280 Main Street West, Hamilton, ON, Canada",
    "McMaster University, 1280 Main St W, Hamilton, ON, Canada",
    "McMaster University Student Centre, Hamilton, ON, Canada",
    "Hamilton City Hall, 71 Main St W, Hamilton, ON, Canada",
    "Hamilton GO Station, 36 Hunter St E, Hamilton, ON, Canada",
    "Westdale Secondary School, 700 Main St W, Hamilton, ON, Canada",
    "Mohawk College, 135 Fennell Ave W, Hamilton, ON, Canada",
    // Toronto, ON
    "University of Toronto, Toronto, ON, Canada",
    "CN Tower, 290 Bremner Blvd, Toronto, ON, Canada",
    "Toronto Pearson International Airport, Mississauga, ON, Canada",
    "Union Station, 65 Front St W, Toronto, ON, Canada",
    // Other Ontario cities
    "University of Waterloo, Waterloo, ON, Canada",
    "Western University, London, ON, Canada",
    "Queen's University, Kingston, ON, Canada",
    "Carleton University, Ottawa, ON, Canada",
    "University of Ottawa, Ottawa, ON, Canada",
  ];

  const lowerQuery = query.toLowerCase();
  return mockAddresses
    .filter((addr) => {
      const lowerAddr = addr.toLowerCase();
      // Ensure address is in Ontario, Canada and matches query
      return (
        (lowerAddr.includes("on, canada") || lowerAddr.includes("ontario")) &&
        lowerAddr.includes(lowerQuery)
      );
    })
    .slice(0, 5);
};

export const AddressAutocomplete = ({
  value,
  onChangeText,
  onSelect,
  placeholder,
  error,
  style,
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleChangeText = (text: string) => {
    onChangeText(text);
    const newSuggestions = getSuggestions(text);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0 && text.length > 0);
  };

  const handleSelect = (address: string) => {
    // Clear any pending blur timeout immediately
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    // Update value first
    onChangeText(address);
    onSelect?.(address);

    // Hide suggestions immediately
    setShowSuggestions(false);
    setSuggestions([]);

    // Manually blur the input after selection to prevent blur event from interfering
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleBlur = () => {
    // Clear any existing timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    // Delay hiding to allow selection - use shorter delay for better UX
    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false);
      blurTimeoutRef.current = null;
    }, 200);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, error && styles.inputError, style]}
          placeholder={placeholder}
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => {
            // Clear any pending blur timeout when focusing
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={handleBlur}
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              onChangeText("");
              setSuggestions([]);
              setShowSuggestions(false);
            }}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            style={styles.suggestionsScroll}
          >
            {suggestions.map((item, index) => (
              <Pressable
                key={`${item}-${index}`}
                style={({ pressed }) => [
                  styles.suggestionItem,
                  pressed && styles.suggestionItemPressed,
                ]}
                onPress={() => {
                  handleSelect(item);
                }}
              >
                <Ionicons name="location" size={20} color="#007AFF" />
                <Text style={styles.suggestionText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    paddingRight: 40,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  clearButton: {
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 1,
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  suggestionsScroll: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionItemPressed: {
    backgroundColor: "#f5f5f5",
  },
  suggestionText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
});
