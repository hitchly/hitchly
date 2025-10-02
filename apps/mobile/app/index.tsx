import React from "react";
import { Button, Text, View } from "react-native";
import { trpc } from "../utils/trpc";

export default function UsersScreen() {
  const usersQuery = trpc.getUsers.useQuery();
  const createUser = trpc.createUser.useMutation();

  return (
    <View style={{ padding: 20 }}>
      {usersQuery.isLoading && <Text>Loading users...</Text>}

      {usersQuery.data?.map((u) => (
        <Text
          key={u.id}
          style={{ fontSize: 16, marginVertical: 2, color: "red" }}
        >
          {u.name} ({u.email})
        </Text>
      ))}

      <Button
        title="Add User"
        onPress={() =>
          createUser.mutate({ name: "Alice", email: "alice@example.com" })
        }
      />
    </View>
  );
}
