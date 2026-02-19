import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

export default function DriverTrips() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>
          My Trips
        </Text>
        <Text
          variant="body"
          color={colors.textSecondary}
          align="center"
          style={styles.subtitle}
        >
          Your list of scheduled and active trips will go here.
        </Text>

        <Button
          title="Post a Ride"
          onPress={() => {
            router.push("/(app)/driver/trips/create");
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 24 },
});
