import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/theme-context";
import { Button } from "../ui/button";

export const RequireLocation = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [status, requestPermission] = Location.useForegroundPermissions();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );

  useEffect(() => {
    if (status?.status === Location.PermissionStatus.UNDETERMINED) {
      void requestPermission();
    }
  }, [status?.status, requestPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (
          appState.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          if (status && !status.granted) {
            void requestPermission();
          }
        }
        setAppState(nextAppState);
      }
    );

    return () => subscription.remove();
  }, [appState, requestPermission, status]);

  if (!status) {
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  }

  if (status.granted) {
    return <>{children}</>;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Location Required
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          To connect you with rides at McMaster, Hitchly needs access to your
          location.
        </Text>

        <View style={styles.buttonContainer}>
          {status.canAskAgain ? (
            <Button
              title="Grant Permission"
              onPress={requestPermission}
              variant="primary"
            />
          ) : (
            <Button
              title="Open Settings"
              onPress={Linking.openSettings}
              variant="secondary"
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: { alignItems: "center", gap: 16 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 16, textAlign: "center", marginBottom: 32 },
  buttonContainer: { width: "100%", gap: 16 },
});
