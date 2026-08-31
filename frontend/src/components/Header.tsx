import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/src/constants/theme";
import { useOfflineSync } from "@/src/context/OfflineSyncContext";
import { useAuth } from "@/src/context/AuthContext";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showOfflineToggle?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = "HEALTH CONNECT",
  subtitle,
  showBack = false,
  showOfflineToggle = true,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSimulatedOffline, toggleSimulatedOffline, pendingCount } = useOfflineSync();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      {/* Top Bar Banner with Government Identity */}
      <View style={[styles.govBar, { paddingTop: insets.top + 5 }]}>
        <View style={styles.govLogoContainer}>
          <View style={styles.emblemBadge}>
            <Ionicons name="medical" size={13} color="#FFFFFF" />
          </View>
          <Text style={styles.govText}>GOVERNMENT HEALTH CONNECT • MCHIS</Text>
        </View>
        <Text style={styles.versionBadge}>v2.6.4 (DEMO)</Text>
      </View>

      {/* Main Header Content */}
      <View style={styles.mainRow}>
        <View style={styles.leftCol}>
          {showBack ? (
            <Pressable
              testID="header-back-button"
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.brandDark} />
            </Pressable>
          ) : (
            <View style={styles.avatarPill}>
              <Ionicons name="shield-checkmark" size={18} color={theme.colors.brand} />
            </View>
          )}

          <View style={styles.titleWrapper}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitleText} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : user ? (
              <Text style={styles.subtitleText} numberOfLines={1}>
                {user.name} ({user.role === "Administrator" ? "Admin" : "Field Worker"})
              </Text>
            ) : null}
          </View>
        </View>

        {/* Action Controls: Offline Switch & Notification Bell */}
        <View style={styles.actionsRow}>
          {showOfflineToggle && (
            <Pressable
              testID="header-offline-toggle-btn"
              onPress={toggleSimulatedOffline}
              style={[
                styles.offlinePill,
                isSimulatedOffline ? styles.offlinePillActive : styles.onlinePillActive,
              ]}
            >
              <Ionicons
                name={isSimulatedOffline ? "cloud-offline" : "cloud-done"}
                size={14}
                color={isSimulatedOffline ? theme.colors.error : theme.colors.success}
              />
              <Text
                style={[
                  styles.offlinePillText,
                  { color: isSimulatedOffline ? theme.colors.error : theme.colors.brandDark },
                ]}
              >
                {isSimulatedOffline ? "Offline" : "Online"}
              </Text>
            </Pressable>
          )}

          {/* Sync Queue Pill */}
          <Pressable
            testID="header-sync-queue-btn"
            onPress={() => router.push("/sync")}
            style={styles.iconButton}
          >
            <Ionicons name="sync-circle-outline" size={22} color={theme.colors.brandDark} />
            {pendingCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </Pressable>

          {/* Notification Bell */}
          <Pressable
            testID="header-notifications-btn"
            onPress={() => router.push("/notifications")}
            style={styles.iconButton}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.colors.brandDark} />
            <View style={styles.notifDot} />
          </Pressable>
        </View>
      </View>

      {/* Simulated Offline Alert Ribbon if Offline */}
      {isSimulatedOffline && (
        <Pressable
          testID="offline-mode-warning-banner"
          onPress={() => router.push("/sync")}
          style={styles.offlineRibbon}
        >
          <Ionicons name="warning-outline" size={14} color="#B91C1C" />
          <Text style={styles.offlineRibbonText}>
            Simulated Offline Mode Active • {pendingCount} records queued locally • Tap to Sync
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  govBar: {
    backgroundColor: theme.colors.surfaceInverse,
    paddingHorizontal: 16,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  govLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emblemBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  govText: {
    color: "#E2E8F0",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  versionBadge: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "600",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 56,
  },
  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 2,
  },
  avatarPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrapper: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  subtitleText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  onlinePillActive: {
    backgroundColor: theme.colors.brandLight,
    borderColor: "#99F6E4",
  },
  offlinePillActive: {
    backgroundColor: theme.colors.errorLight,
    borderColor: "#FECACA",
  },
  offlinePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeCount: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: theme.colors.error,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.brand,
  },
  offlineRibbon: {
    backgroundColor: "#FEE2E2",
    borderTopWidth: 1,
    borderTopColor: "#FECACA",
    paddingHorizontal: 16,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  offlineRibbonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B91C1C",
  },
});
