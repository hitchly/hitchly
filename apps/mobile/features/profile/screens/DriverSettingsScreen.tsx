import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/context/theme-context";
import { SettingsSection } from "@/features/profile/components/sections/SettingsSection";
import { useProfile } from "@/features/profile/hooks/useProfile";

export function DriverSettingsScreen() {
  const { colors } = useTheme();
  const p = useProfile();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["bottom"]}
    >
      <View style={styles.container}>
        <SettingsSection
          onSignOut={() => void p.handleSignOut()}
          isSigningOut={p.isSigningOut}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
});
