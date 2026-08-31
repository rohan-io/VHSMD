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
  } else if (norm.includes("trimester 1") || norm.includes("1st")) {
    bg = "#E0F2FE";
    fg = "#0369A1";
    border = "#BAE6FD";
  } else if (norm.includes("trimester 2") || norm.includes("2nd")) {
    bg = "#EDE9FE";
    fg = "#6D28D9";
    border = "#DDD6FE";
  } else if (norm.includes("trimester 3") || norm.includes("3rd")) {
    bg = "#FEF3C7";
    fg = "#B45309";
    border = "#FDE68A";
  }

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
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
