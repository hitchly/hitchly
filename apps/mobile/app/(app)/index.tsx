// apps/mobile/app/index.tsx
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { trpc } from "../../lib/trpc";

export default function HomeScreen() {
  const { data, isLoading, error } = trpc.health.ping.useQuery();

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Feed</Text>
      <Text style={styles.subtitle}>Welcome to the protected application!</Text>
      <Text>Server says: {data?.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: { fontSize: 22, fontWeight: "bold" },
  subtitle: { marginTop: 10, color: "gray" },
});
