import type { ReactNode } from "react";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useUserRole } from "@/context/role-context";
import { useTheme } from "@/context/theme-context";
import { useDriverVerification } from "@/features/identity/hooks/useDriverVerification";
import { authClient } from "@/lib/auth-client";

export const DriverVerificationGuard = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { colors } = useTheme();
  const { role } = useUserRole();
  const { data: session, refetch } = authClient.useSession();
  const { present, status, isLoading, error } = useDriverVerification();

  const isDriver = role === "driver";

  const isVerified = session?.user.isVerifiedDriver;

  useEffect(() => {
    if (status === "FlowCompleted") {
      void refetch();
    }
  }, [status, refetch]);

  if (!isDriver || isVerified) {
    return <>{children}</>;
  }

  const handleVerifyPress = () => {
    void present();
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

        {error && (
          <Text
            variant="bodySemibold"
            color={colors.error}
            align="center"
            style={styles.errorText}
          >
            {error.message}
          </Text>
        )}

        <Button
          title="VERIFY ONTARIO LICENSE"
          onPress={handleVerifyPress}
          isLoading={isLoading}
          variant="primary"
          style={styles.actionButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
    alignItems: "center",
  },
  title: {
    marginBottom: 12,
  },
  description: {
    marginBottom: 32,
  },
  errorText: {
    marginBottom: 24,
  },
  actionButton: {
    marginTop: 8,
  },
});
