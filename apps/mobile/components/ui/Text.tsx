import type { TextProps as RNTextProps, TextStyle } from "react-native";
import { Text as RNText, StyleSheet } from "react-native";

import { Fonts, FontSizes, FontWeights } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";

export type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodySemibold"
  | "caption"
  | "captionSemibold"
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
    color ??
    (variant.startsWith("caption") || variant === "label"
      ? colors.textSecondary
      : colors.text);

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
    fontSize: FontSizes.h1,
    fontWeight: FontWeights.heavy,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: FontSizes.h2,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.bold,
  },
  h3: {
    fontSize: FontSizes.h3,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.bold,
  },
  body: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },
  bodySemibold: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.bold,
  },
  label: {
    fontSize: FontSizes.label,
    fontWeight: FontWeights.medium,
    fontFamily: Fonts.regular,
    textTransform: "uppercase",
    letterSpacing: 1.5, // Increased for Vercel "Utility" look
  },
  caption: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.regular,
    fontFamily: Fonts.regular,
  },
  captionSemibold: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.bold,
  },
  mono: {
    fontSize: FontSizes.mono,
    fontFamily: Fonts.mono,
    letterSpacing: 0.5,
  },
});
