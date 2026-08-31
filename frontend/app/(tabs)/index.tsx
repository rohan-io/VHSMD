import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { MetricCard } from "@/src/components/MetricCard";
import { useAuth } from "@/src/context/AuthContext";
import { useOfflineSync } from "@/src/context/OfflineSyncContext";
import { getDashboard, DashboardResponse } from "@/src/api/mch";

const QUICK_ACTIONS = [
  { key: "reg-preg", label: "Register\nPregnancy", icon: "add-circle" as const, route: "/pregnancy/register", color: theme.colors.brand },
  { key: "reg-child", label: "Register\nChild", icon: "happy" as const, route: "/child/register", color: theme.colors.info },
  { key: "anc", label: "Record\nANC Visit", icon: "clipboard" as const, route: "/pregnancy", color: theme.colors.warning },
  { key: "sync", label: "Sync\nCenter", icon: "sync-circle" as const, route: "/sync", color: theme.colors.success },
];

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: theme.colors.error,
  HIGH: "#EA580C",
  MEDIUM: theme.colors.warning,
  LOW: theme.colors.info,
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { pendingCount, lastSyncTime } = useOfflineSync();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getDashboard();
      setData(res);
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const s = data?.summary || {};

  return (
    <View style={styles.root}>
      <Header subtitle={user ? `${user.name}` : undefined} />

      {loading ? (
        <View style={styles.centerFill} testID="dashboard-loading">
          <ActivityIndicator size="large" color={theme.colors.brand} />
          <Text style={styles.loadingText}>Synchronising live registries…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerFill} testID="dashboard-error">
          <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
          <Text style={styles.errorTitle}>Unable to load dashboard</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <Pressable testID="dashboard-retry-btn" onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />
          }
        >
          {/* Greeting Banner */}
          <View style={styles.greetBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetHi}>Health Worker Dashboard</Text>
              <Text style={styles.greetName}>{user?.name || "Field Worker"}</Text>
              <Text style={styles.greetSector}>{user?.phc_center} • {user?.sector}</Text>
            </View>
            <View style={styles.syncChip}>
              <Ionicons name="time-outline" size={12} color={theme.colors.brandDark} />
              <Text style={styles.syncChipText}>Synced {lastSyncTime || "—"}</Text>
            </View>
          </View>

          {pendingCount > 0 && (
            <Pressable
              testID="dashboard-pending-sync-banner"
              onPress={() => router.push("/sync")}
              style={styles.pendingBanner}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#B45309" />
              <Text style={styles.pendingText}>
                {pendingCount} record{pendingCount > 1 ? "s" : ""} waiting for synchronization
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#B45309" />
            </Pressable>
          )}

          {/* Pregnancy Metrics */}
          <Text style={styles.sectionTitle}>Pregnancy Overview</Text>
          <View style={styles.grid}>
            <MetricCard testID="metric-total-pregnancies" title="Total Pregnancies" value={s.total_pregnancies ?? 0} icon="woman" color={theme.colors.brand} onPress={() => router.push("/pregnancy")} />
            <MetricCard testID="metric-high-risk" title="High Risk" value={s.high_risk_pregnancies ?? 0} icon="alert-circle" color={theme.colors.error} onPress={() => router.push("/pregnancy")} />
          </View>
          <View style={styles.grid}>
            <MetricCard testID="metric-trimester-1" title="1st Trimester" value={s.trimester_1 ?? 0} icon="leaf" color="#0369A1" />
            <MetricCard testID="metric-trimester-2" title="2nd Trimester" value={s.trimester_2 ?? 0} icon="fitness" color="#6D28D9" />
            <MetricCard testID="metric-trimester-3" title="3rd Trimester" value={s.trimester_3 ?? 0} icon="heart-circle" color="#B45309" />
          </View>

          {/* ANC + Maternal Immunisation */}
          <Text style={styles.sectionTitle}>ANC & Maternal Immunisation</Text>
          <View style={styles.grid}>
            <MetricCard testID="metric-anc-due" title="ANC Due" value={s.anc_due ?? 0} icon="calendar" color={theme.colors.warning} />
            <MetricCard testID="metric-anc-overdue" title="ANC Overdue" value={s.anc_overdue ?? 0} icon="calendar-clear" color={theme.colors.error} />
          </View>
          <View style={styles.grid}>
            <MetricCard testID="metric-mat-vaccine-due" title="Vaccine Due" value={s.maternal_vaccine_due ?? 0} icon="medkit" color={theme.colors.warning} />
            <MetricCard testID="metric-mat-vaccine-overdue" title="Vaccine Overdue" value={s.maternal_vaccine_overdue ?? 0} icon="medkit" color={theme.colors.error} />
          </View>

          {/* Children */}
          <Text style={styles.sectionTitle}>Child Immunisation</Text>
          <View style={styles.grid}>
            <MetricCard testID="metric-children" title="Registered Children" value={s.total_children ?? 0} icon="body" color={theme.colors.info} onPress={() => router.push("/children")} />
            <MetricCard testID="metric-child-vaccine-due" title="Vaccines Due" value={s.child_vaccines_due ?? 0} icon="bandage" color={theme.colors.warning} onPress={() => router.push("/children")} />
          </View>
          <View style={styles.grid}>
            <MetricCard testID="metric-child-vaccine-overdue" title="Vaccines Overdue" value={s.child_vaccines_overdue ?? 0} icon="bandage" color={theme.colors.error} onPress={() => router.push("/children")} />
            <MetricCard testID="metric-child-vaccine-done" title="Vaccines Given" value={s.child_vaccines_completed ?? 0} icon="checkmark-done-circle" color={theme.colors.success} onPress={() => router.push("/children")} />
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            {QUICK_ACTIONS.map((a) => (
              <Pressable
                key={a.key}
                testID={`quick-action-${a.key}`}
                onPress={() => router.push(a.route as any)}
                style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${a.color}18` }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Today's Alerts */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Today&apos;s Priority Alerts</Text>
            <Pressable testID="dashboard-view-all-alerts" onPress={() => router.push("/alerts")}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>
          {(data?.todays_alerts || []).length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={22} color={theme.colors.success} />
              <Text style={styles.emptyText}>All beneficiaries are up to date.</Text>
            </View>
          ) : (
            (data?.todays_alerts || []).slice(0, 5).map((al) => (
              <Pressable
                key={al.id}
                testID={`dashboard-alert-${al.id}`}
                onPress={() =>
                  al.related_entity_type === "pregnancy"
                    ? router.push(`/pregnancy/${al.related_entity_id}` as any)
                    : router.push(`/child/${al.related_entity_id}` as any)
                }
                style={styles.alertRow}
              >
                <View style={[styles.alertBar, { backgroundColor: PRIORITY_COLOR[al.priority] || theme.colors.info }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle} numberOfLines={1}>{al.title}</Text>
                  <Text style={styles.alertMsg} numberOfLines={2}>{al.message}</Text>
                </View>
                <View style={[styles.priorityPill, { backgroundColor: `${PRIORITY_COLOR[al.priority]}18` }]}>
                  <Text style={[styles.priorityText, { color: PRIORITY_COLOR[al.priority] }]}>{al.priority}</Text>
                </View>
              </Pressable>
            ))
          )}

          {/* Recent Registrations */}
          <Text style={styles.sectionTitle}>Recent Registrations</Text>
          {(data?.recent_pregnancies || []).slice(0, 4).map((p) => (
            <Pressable
              key={p.id}
              testID={`recent-preg-${p.id}`}
              onPress={() => router.push(`/pregnancy/${p.id}` as any)}
              style={styles.recentRow}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{p.full_name?.charAt(0) || "?"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentName}>{p.full_name}</Text>
                <Text style={styles.recentSub}>{p.village} • {p.gestational_age_label}</Text>
              </View>
              {p.is_high_risk && (
                <Ionicons name="warning" size={18} color={theme.colors.error} />
              )}
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}

          <View style={styles.disclaimerBox}>
            <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.textMuted} />
            <Text style={styles.disclaimerText}>
              DEMO SCHEDULE — Replace with approved clinical/government schedule before production.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  scroll: { padding: 16, paddingBottom: 32 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  loadingText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 8 },
  errorTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary, marginTop: 8 },
  errorSub: { fontSize: 12, color: theme.colors.textSecondary, textAlign: "center" },
  retryBtn: { marginTop: 12, backgroundColor: theme.colors.brand, paddingHorizontal: 24, paddingVertical: 10, borderRadius: theme.radius.md },
  retryText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  greetBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceInverse,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  greetHi: { color: "#94A3B8", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  greetName: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginTop: 2 },
  greetSector: { color: "#CBD5E1", fontSize: 11, marginTop: 2 },
  syncChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.brandLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: theme.radius.sm },
  syncChipText: { fontSize: 10, fontWeight: "700", color: theme.colors.brandDark },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.warningLight,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#B45309" },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.textPrimary, marginTop: 12, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  viewAll: { fontSize: 12, fontWeight: "700", color: theme.colors.brand },
  grid: { flexDirection: "row", gap: 8 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionTile: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  actionLabel: { fontSize: 10, fontWeight: "700", color: theme.colors.textPrimary, textAlign: "center", lineHeight: 13 },
  emptyCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.successLight, borderRadius: theme.radius.md, padding: 14 },
  emptyText: { fontSize: 12, color: "#065F46", fontWeight: "600" },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  alertBar: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
  alertMsg: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  priorityPill: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  priorityText: { fontSize: 9, fontWeight: "800" },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.brandLight, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontWeight: "800", color: theme.colors.brandDark },
  recentName: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
  recentSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  disclaimerBox: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20, paddingHorizontal: 4 },
  disclaimerText: { flex: 1, fontSize: 10, color: theme.colors.textMuted, fontStyle: "italic" },
});
