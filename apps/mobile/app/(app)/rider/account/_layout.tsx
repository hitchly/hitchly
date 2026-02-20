import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";

import { useTheme } from "@/context/theme-context";
import { useStackOptions } from "@/hooks/useNavigationOptions";

export default function RiderAccountLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  const stackOptions = useStackOptions();

  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: "Account",
          headerRight: () => (
            <Pressable
              onPress={() => {
                router.push("/(app)/rider/account/settings");
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
                marginRight: 8,
                padding: 4,
              })}
            >
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="payments" options={{ title: "Payments" }} />
    </Stack>
  );
}
