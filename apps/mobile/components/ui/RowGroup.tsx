import type { ReactNode } from "react";
import { Children, Fragment } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/context/theme-context";

interface RowGroupProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function RowGroup({ children, style }: RowGroupProps) {
  const { colors } = useTheme();

  const childrenArray = Children.toArray(children);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {childrenArray.map((child, index) => (
        <Fragment key={index}>
          {child}
          {index < childrenArray.length - 1 && (
            <View
              style={[styles.divider, { backgroundColor: colors.divider }]}
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
