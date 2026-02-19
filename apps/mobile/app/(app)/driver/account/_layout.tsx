import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";

import { useTheme } from "@/context/theme-context";

export default function DriverAccountLayout() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Account",
          headerRight: () => (
            <Pressable
              onPress={() => {
                router.push("/driver/account/settings");
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                marginRight: 8,
              })}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={colors.primary}
              />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
