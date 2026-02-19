import type { TextProps as RNTextProps, TextStyle } from "react-native";
import { Text as RNText, StyleSheet } from "react-native";

import { Fonts } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";

export type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodySemibold"
  | "caption"
  | "label"
  | "mono";

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle["textAlign"];
  weight?: TextStyle["fontWeight"];
}

export function Text({
  variant = "body",
  color,
  align,
  weight,
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();

  const variantStyle = styles[variant];

  const textColor =
    color ?? (variant === "caption" ? colors.textSecondary : colors.text);

  return (
    <RNText
      style={[
        variantStyle,
        { color: textColor, textAlign: align },
        weight ? { fontWeight: weight } : null,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: "800",
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: Fonts.bold,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Fonts.bold,
  },
  body: {
    fontSize: 16,
    fontWeight: "400",
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Fonts.bold,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: Fonts.regular,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400",
    fontFamily: Fonts.regular,
  },
  mono: {
    fontSize: 14,
    fontFamily: Fonts.mono,
  },
});
