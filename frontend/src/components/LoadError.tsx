import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/constants/theme";

interface Props {
  message?: string;
  onRetry: () => void;
  testID?: string;
}

/**
 * Shown when a fetch failed — distinct from an empty result, so a dropped
 * connection never reads as "nothing here yet" and prompts a duplicate entry.
 */
export const LoadError: React.FC<Props> = ({
  message = "Can't reach the server right now.",
  onRetry,
  testID,
}) => (
  <View style={styles.wrap} testID={testID}>
    <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
    <Text style={styles.title}>Couldn&apos;t load</Text>
    <Text style={styles.sub}>{message}</Text>
    <Pressable
      onPress={onRetry}
      style={styles.btn}
      testID={testID ? `${testID}-retry` : undefined}
    >
      <Ionicons name="refresh" size={15} color="#FFFFFF" />
      <Text style={styles.btnText}>Retry</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 8, minHeight: 240 },
  title: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary, marginTop: 4 },
  sub: { fontSize: 12, color: theme.colors.textSecondary, textAlign: "center" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  btnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
