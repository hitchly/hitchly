// apps/mobile/app/index.tsx
import { ActivityIndicator, Text, View } from "react-native";
import { trpc } from "../lib/trpc";

export default function TestTRPC() {
  const { data, isLoading, error } = trpc.health.ping.useQuery();

  console.log("TRPC Health Check:", { data, isLoading, error });

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <View style={{ padding: 24 }}>
      <Text>{data?.message}</Text>
    </View>
  );
}
