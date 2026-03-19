import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useUserRole } from "@/context/role-context";
import { useTheme } from "@/context/theme-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export const DriverVerificationGuard = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { colors } = useTheme();
  const { role } = useUserRole();
  const { data: session, refetch } = authClient.useSession();

  const { mutateAsync: createSession, isPending } =
    trpc.identity.createVerificationSession.useMutation();

  const { mutateAsync: bypassVerification, isPending: isBypassing } =
    trpc.identity.bypassDriverVerificationForTesting.useMutation();

  const isDriver = role === "driver";
  const isVerified = session?.user.isVerifiedDriver;

  if (!isDriver || isVerified) {
    return <>{children}</>;
  }

  const handleVerifyPress = async () => {
    try {
      const { url } = await createSession();

      if (url) {
        await WebBrowser.openBrowserAsync(url);

        void refetch();
      }
    } catch {
      Alert.alert(
        "Verification Error",
        "An error occurred while trying to start the verification process. Please try again later."
      );
    }
  };

  const handleBypassPress = () => {
    Alert.alert(
      "Bypass verification?",
      "This is only intended for local testing. Your account will be marked as verified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Bypass (dev)",
          style: "destructive",
          onPress: () =>
            void (async () => {
              try {
                await bypassVerification();
                void refetch();
              } catch {
                Alert.alert(
                  "Bypass Failed",
                  "Unable to bypass verification. Please try again."
                );
              }
            })(),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="h2" align="center" style={styles.title}>
            Action Required
          </Text>
        </View>

        <Text
          variant="body"
          color={colors.textSecondary}
          align="center"
          style={styles.description}
        >
          To keep the campus community safe, all Hitchly drivers must verify a
          valid Ontario Driver&apos;s License before accepting rides.
        </Text>

        <Button
          title="VERIFY ONTARIO LICENSE"
          onPress={void handleVerifyPress}
          isLoading={isPending}
          variant="primary"
          style={styles.actionButton}
        />

        {__DEV__ ? (
          <Button
            title="BYPASS (DEV)"
            onPress={handleBypassPress}
            isLoading={isBypassing}
            variant="secondary"
            style={styles.bypassButton}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  content: { padding: 24, paddingBottom: 60 },
  header: { marginBottom: 16, alignItems: "center" },
  title: { marginBottom: 12 },
  description: { marginBottom: 32 },
  actionButton: { marginTop: 8 },
  bypassButton: { marginTop: 12 },
});
