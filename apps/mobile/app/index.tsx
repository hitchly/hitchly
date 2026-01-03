import { Text, View } from "react-native";
import { trpc } from "../utils/trpc";

export default function UsersScreen() {
  const userQuery = trpc.user.getCurrent.useQuery();
  console.log("User data:", userQuery.data);
  return (
    <View style={{ padding: 20 }}>
      {userQuery.isLoading && <Text>Loading user...</Text>}

      {userQuery.data && (
        <Text style={{ fontSize: 16, marginVertical: 2, color: "red" }}>
          {userQuery.data.email || "No email"}
        </Text>
      )}
    </View>
  );
}
