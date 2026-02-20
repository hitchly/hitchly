import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";

import { useTheme } from "@/context/theme-context";
import { useStackOptions } from "@/hooks/useNavigationOptions";

export default function DriverAccountLayout() {
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
                router.push("/driver/account/settings");
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                marginRight: 8,
              })}
            >
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="payouts" options={{ title: "Payouts" }} />
    </Stack>
  );
}
