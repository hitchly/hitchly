import type { ReactNode } from "react";
import { Children, Fragment } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/context/theme-context";

export type RowGroupAlignment = "start" | "center" | "end" | "stretch";

interface RowGroupProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  alignment?: RowGroupAlignment;
}

const alignmentMap: Record<RowGroupAlignment, ViewStyle["alignItems"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

export function RowGroup({
  children,
  style,
  alignment = "stretch",
}: RowGroupProps) {
  const { colors } = useTheme();

  const childrenArray = Children.toArray(children);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
          alignItems: alignmentMap[alignment],
        },
        style,
      ]}
    >
      {childrenArray.map((child, index) => (
        <Fragment key={index}>
          {child}
          {index < childrenArray.length - 1 && (
            <View
              style={[
                styles.divider,
                {
                  backgroundColor: colors.divider,
                  alignSelf: "stretch",
                },
              ]}
            />
          )}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});
