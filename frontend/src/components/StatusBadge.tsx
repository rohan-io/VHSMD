import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@/src/constants/theme";

interface StatusBadgeProps {
  status: string;
  variant?: "solid" | "subtle";
  testID?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = "subtle",
  testID,
}) => {
  const norm = status?.toLowerCase() || "";

  let bg = theme.colors.surfaceTertiary;
  let fg = theme.colors.textSecondary;
  let border = theme.colors.border;

  if (
    norm.includes("completed") ||
    norm.includes("done") ||
    norm.includes("healthy") ||
    norm.includes("synced") ||
    norm.includes("normal")
  ) {
    bg = theme.colors.successLight;
    fg = "#065F46";
    border = "#A7F3D0";
  } else if (
    norm.includes("due") ||
    norm.includes("upcoming") ||
    norm.includes("scheduled") ||
    norm.includes("pending")
  ) {
    bg = theme.colors.warningLight;
    fg = "#92400E";
    border = "#FDE68A";
  } else if (
    norm.includes("overdue") ||
    norm.includes("critical") ||
    norm.includes("high risk") ||
    norm.includes("missed")
  ) {
    bg = theme.colors.errorLight;
    fg = "#991B1B";
    border = "#FECACA";
  }
  // Trimester is ordinal stage info, not a status — the label carries it.
  // Left neutral so colour stays reserved for done / due / risk.

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        {
          backgroundColor: variant === "solid" ? fg : bg,
          borderColor: variant === "solid" ? fg : border,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: variant === "solid" ? "#FFFFFF" : fg },
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: variant === "solid" ? "#FFFFFF" : fg },
        ]}
      >
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    gap: 4,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
