import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { useAuth } from "@/src/context/AuthContext";
import { useOfflineSync } from "@/src/context/OfflineSyncContext";
import { useToast } from "@/src/components/Toast";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isSimulatedOffline, toggleSimulatedOffline, pendingCount, lastSyncTime } = useOfflineSync();
  const { showToast } = useToast();

  const handleLogout = async () => {
    await logout();
    showToast("Signed out successfully.", "info");
    router.replace("/(auth)/login");
  };

  const rows = [
    { icon: "sync-circle-outline" as const, label: "Offline Sync Center", sub: `${pendingCount} pending • Last synced ${lastSyncTime || "—"}`, action: () => router.push("/sync") },
    { icon: "notifications-outline" as const, label: "Notifications", sub: "Campaign & program broadcasts", action: () => router.push("/notifications") },
    { icon: "shield-checkmark-outline" as const, label: "Assigned Villages", sub: (user?.assigned_villages || []).join(", ") || "—", action: () => {} },
  ];

  return (
    <View style={styles.root}>
      <Header title="Profile & Settings" showOfflineToggle={false} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard} testID="profile-card">
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{user?.name?.charAt(0) || "?"}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="ribbon" size={12} color={theme.colors.brandDark} />
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>
          <View style={styles.profileMetaRow}>
            <View style={styles.profileMetaItem}>
              <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.profileMetaText}>{user?.mobile || "—"}</Text>
            </View>
            <View style={styles.profileMetaItem}>
              <Ionicons name="business-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.profileMetaText}>{user?.phc_center || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Simulated Offline Toggle */}
        <Text style={styles.sectionTitle}>Field Connectivity</Text>
        <View style={styles.toggleCard}>
          <View style={[styles.toggleIcon, { backgroundColor: isSimulatedOffline ? theme.colors.errorLight : theme.colors.brandLight }]}>
            <Ionicons name={isSimulatedOffline ? "cloud-offline" : "cloud-done"} size={20} color={isSimulatedOffline ? theme.colors.error : theme.colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Simulated Offline Mode</Text>
            <Text style={styles.toggleSub}>
              {isSimulatedOffline ? "Records saved locally, will sync when back online." : "Live connection to central server."}
            </Text>
          </View>
          <Switch
            testID="profile-offline-switch"
            value={isSimulatedOffline}
            onValueChange={toggleSimulatedOffline}
            trackColor={{ false: theme.colors.borderStrong, true: "#FCA5A5" }}
            thumbColor={isSimulatedOffline ? theme.colors.error : "#FFFFFF"}
          />
        </View>

        {/* Menu rows */}
        <Text style={styles.sectionTitle}>Tools</Text>
        {rows.map((r, i) => (
          <Pressable key={i} testID={`profile-row-${i}`} onPress={r.action} style={styles.menuRow}>
            <View style={styles.menuIcon}>
              <Ionicons name={r.icon} size={20} color={theme.colors.brandDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{r.label}</Text>
              <Text style={styles.menuSub} numberOfLines={1}>{r.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>
        ))}

        <Pressable testID="profile-logout-btn" onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.footerText}>HEALTH CONNECT • v2.6.4 (DEMO)</Text>
        <Text style={styles.footerSub}>DEMO ONLY — Change credentials before production.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  scroll: { padding: 16, paddingBottom: 32 },
  profileCard: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.lg, padding: 20, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.brand, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  bigAvatarText: { fontSize: 30, fontWeight: "800", color: "#FFFFFF" },
  profileName: { fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.brandLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill, marginTop: 6 },
  roleText: { fontSize: 11, fontWeight: "800", color: theme.colors.brandDark },
  profileMetaRow: { flexDirection: "row", gap: 16, marginTop: 12, flexWrap: "wrap", justifyContent: "center" },
  profileMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  profileMetaText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.textPrimary, marginTop: 20, marginBottom: 10 },
  toggleCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  toggleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  toggleSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  menuIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  menuSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.errorLight, borderRadius: theme.radius.md, paddingVertical: 14, marginTop: 20 },
  logoutText: { fontSize: 14, fontWeight: "800", color: theme.colors.error },
  footerText: { textAlign: "center", fontSize: 11, color: theme.colors.textMuted, fontWeight: "700", marginTop: 20 },
  footerSub: { textAlign: "center", fontSize: 10, color: theme.colors.textMuted, marginTop: 2, fontStyle: "italic" },
});
