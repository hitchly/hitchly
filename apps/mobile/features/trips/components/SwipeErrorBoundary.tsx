import { Component, type ReactNode } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { IconBox } from "@/components/ui/IconBox";
import { Text } from "@/components/ui/Text";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SwipeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error) {
    Alert.alert("SwipeDeck Error:", error.message);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <IconBox name="warning-outline" variant="error" size={32} />
          <Text variant="h3" style={styles.errorTitle}>
            SWIPE ERROR
          </Text>
          <Text
            variant="body"
            color="textSecondary"
            align="center"
            style={styles.errorMessage}
          >
            {this.state.error?.message ??
              "An unexpected error occurred while loading matches."}
          </Text>
          <Button
            title="TRY AGAIN"
            variant="secondary"
            onPress={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset?.();
            }}
          />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  errorTitle: { marginTop: 8 },
  errorMessage: { marginBottom: 12 },
});
