import type { ReactNode } from "react";
import { useRef, useState } from "react";
import type {
  NativeSyntheticEvent,
  TargetedEvent,
  TextInputProps,
} from "react-native";
import { Animated, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "@/context/theme-context";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: NativeSyntheticEvent<TargetedEvent>): void => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();

    if (onFocus) {
      onFocus(e);
    }
  };

  const handleBlur = (e: NativeSyntheticEvent<TargetedEvent>): void => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    if (onBlur) {
      onBlur(e);
    }
  };

  const hasError = (error ?? "") !== "";

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [hasError ? colors.error : colors.border, colors.primary],
  });

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.background,
            borderColor: borderColor,
            borderWidth: isFocused ? 1.5 : 1,
          },
          hasError
            ? {
                backgroundColor: colors.errorBackground,
                borderColor: colors.error,
                borderWidth: 1.5,
              }
            : null,
        ]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            leftIcon ? styles.paddingLeftSmall : null,
            rightIcon ? styles.paddingRightSmall : null,
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </Animated.View>

      {(error ?? helperText) ? (
        <Text
          style={[
            styles.helper,
            { color: hasError ? colors.error : colors.textTertiary },
          ]}
        >
          {error ?? helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  paddingLeftSmall: {
    paddingLeft: 8,
  },
  paddingRightSmall: {
    paddingRight: 8,
  },
  iconLeft: {
    marginRight: 4,
  },
  iconRight: {
    marginLeft: 4,
  },
  helper: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: "500",
  },
});
