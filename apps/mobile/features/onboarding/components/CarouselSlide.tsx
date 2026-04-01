import type { Ionicons } from "@expo/vector-icons";
import { View, useWindowDimensions } from "react-native";

import { Card } from "@/components/ui/Card";
import { IconBox } from "@/components/ui/IconBox";
import { Text } from "@/components/ui/Text";

export interface SlideData {
  id: string;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

interface CarouselSlideProps {
  item: SlideData;
}

export function CarouselSlide({ item }: CarouselSlideProps) {
  const { width } = useWindowDimensions();

  return (
    <View
      style={{
        width,
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      <View style={{ marginBottom: 40 }}>
        <IconBox name={item.iconName} />
      </View>

      <Card style={{ width: "100%", padding: 24, alignItems: "center" }}>
        <Text variant="h2" style={{ textAlign: "center", marginBottom: 12 }}>
          {item.title}
        </Text>
        <Text variant="body" style={{ textAlign: "center", opacity: 0.7 }}>
          {item.description}
        </Text>
      </Card>
    </View>
  );
}
