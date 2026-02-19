import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface DirectionToggleProps {
  isToCampus: boolean;
  onToggle: (toCampus: boolean) => void;
}

export function DirectionToggle({
  isToCampus,
  onToggle,
}: DirectionToggleProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          { borderColor: colors.primary },
          isToCampus
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.surface },
        ]}
        onPress={() => {
          onToggle(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons
          name="school-outline"
          size={20}
          color={isToCampus ? "#fff" : colors.primary}
        />
        <Text
          variant="bodySemibold"
          color={isToCampus ? "#fff" : colors.primary}
        >
          To McMaster
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          { borderColor: colors.primary },
          !isToCampus
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.surface },
        ]}
        onPress={() => {
          onToggle(false);
        }}
        activeOpacity={0.8}
      >
        <Ionicons
          name="home-outline"
          size={20}
          color={!isToCampus ? "#fff" : colors.primary}
        />
        <Text
          variant="bodySemibold"
          color={!isToCampus ? "#fff" : colors.primary}
        >
          From Campus
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
