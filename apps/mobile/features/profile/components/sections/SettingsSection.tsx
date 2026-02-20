import { Alert, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/components/ui/SegmentedControl";
import { AppRole, type AppRoleType } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";
import { useTheme } from "@/context/theme-context";
import { useSignOut } from "@/features/auth/hooks/useSignOut";
import { InfoCard } from "@/features/profile/components/InfoCard";

export function SettingsSection() {
  const { role, toggleRole } = useUserRole();
  const { handleSignOut, isSigningOut } = useSignOut();
  const { colors } = useTheme();

  const ROLE_OPTIONS: readonly SegmentOption<AppRoleType>[] = [
    { label: "Rider", value: AppRole.RIDER },
    { label: "Driver", value: AppRole.DRIVER },
  ] as const;

  const onSignOutPress = (): void => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          void handleSignOut();
        },
      },
    ]);
  };

  const handleRoleToggle = (newValue: AppRoleType): void => {
    if (newValue === role) return;
    void toggleRole();
  };

  return (
    <View style={styles.container}>
      <InfoCard title="Application Preferences">
        <View style={styles.formContainer}>
          <SegmentedControl<AppRoleType>
            label="Active Mode"
            options={ROLE_OPTIONS}
            value={role}
            onChange={handleRoleToggle}
          />
        </View>
      </InfoCard>

      <Button
        title="SIGN OUT"
        variant="ghost"
        icon="log-out-outline"
        onPress={onSignOutPress}
        disabled={isSigningOut}
        isLoading={isSigningOut}
        style={styles.signOut}
        textStyle={{ color: colors.textSecondary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  formContainer: { paddingTop: 8 },
  signOut: {
    marginTop: 8,
    marginBottom: 24,
  },
});
