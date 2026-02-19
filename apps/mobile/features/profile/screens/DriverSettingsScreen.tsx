import { StyleSheet, View } from "react-native";

import { useTheme } from "@/context/theme-context";
import { SettingsSection } from "@/features/profile/components/sections/SettingsSection";

export function DriverSettingsScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <SettingsSection />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
});
