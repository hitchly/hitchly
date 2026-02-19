import { Alert, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { InfoCard } from "@/components/ui/card/InfoCard";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/components/ui/SegmentedControl";
import { AppRole, type AppRoleType } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";

interface SettingsSectionProps {
  onSignOut: () => void;
  isSigningOut: boolean;
}

const ROLE_OPTIONS: readonly SegmentOption<AppRoleType>[] = [
  { label: "Rider", value: AppRole.RIDER },
  { label: "Driver", value: AppRole.DRIVER },
] as const;

export function SettingsSection({
  onSignOut,
  isSigningOut,
}: SettingsSectionProps) {
  const { role, toggleRole } = useUserRole();

  const handleRoleToggle = (newValue: AppRoleType): void => {
    if (newValue === role) return;

    const targetLabel = newValue === AppRole.RIDER ? "Rider" : "Driver";

    Alert.alert(
      "Switch Roles",
      `Are you sure you want to switch to ${targetLabel} mode? This will refresh your current view.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          onPress: () => {
            void toggleRole();
          },
        },
      ]
    );
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
        title="Sign Out"
        variant="danger"
        onPress={onSignOut}
        disabled={isSigningOut}
        isLoading={isSigningOut}
        style={styles.signOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  formContainer: {
    paddingTop: 8,
  },
  signOut: { marginTop: 8 },
});
