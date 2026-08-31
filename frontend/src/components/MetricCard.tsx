import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/constants/theme";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  bgColor?: string;
  onPress?: () => void;
  testID?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = theme.colors.brand,
  bgColor = theme.colors.surfaceSecondary,
  onPress,
  testID,
}) => {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bgColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.valueText, { color: color }]}>{value}</Text>
      </View>

      <Text style={styles.titleText} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitleText} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  titleText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  subtitleText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
