import React, { useState, useCallback, useMemo } from "react";
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

import { useTheme } from "@/src/context/ThemeContext";
import type { Theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { MetricCard } from "@/src/components/MetricCard";
import { LoadError } from "@/src/components/LoadError";
import { useAuth } from "@/src/context/AuthContext";
import { useOfflineSync } from "@/src/context/OfflineSyncContext";
import { getDashboard, DashboardResponse } from "@/src/api/mch";
import { priorityColor } from "@/src/utils/priority";

export default function DashboardScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const PRIORITY_COLOR = useMemo(() => priorityColor(t), [t]);
  const QUICK_ACTIONS = useMemo(
    () => [
      { key: "reg-preg", label: "Register\nPregnancy", icon: "add-circle" as const, route: "/pregnancy/register", color: t.colors.brandText },
      { key: "reg-child", label: "Register\nChild", icon: "person-add" as const, route: "/child/register", color: t.colors.info },
      { key: "anc", label: "Record\nANC Visit", icon: "clipboard" as const, route: "/pregnancy", color: t.colors.warning },
      { key: "sync", label: "Sync\nCenter", icon: "sync-circle" as const, route: "/sync", color: t.colors.success },
    ],
    [t],
  );
  const { user } = useAuth();
  const { pendingCount, lastSyncTime } = useOfflineSync();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCaseload, setShowCaseload] = useState(false);

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
          <ActivityIndicator size="large" color={t.colors.brand} />
          <Text style={styles.loadingText}>Synchronising live registries…</Text>
        </View>
      ) : error ? (
        <LoadError message={error} onRetry={load} testID="dashboard-error" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.brand} />
          }
        >
          {/* Context strip: where you are, whether your data is current */}
          <View style={styles.greetBanner}>
            <View style={styles.greetText}>
              <Text style={styles.greetPlace} numberOfLines={2}>{user?.phc_center || "Primary Health Centre"}</Text>
              <Text style={styles.greetSector} numberOfLines={1}>{user?.sector || "Field area"}</Text>
            </View>
            <View style={styles.syncChip}>
              <Ionicons name="time-outline" size={12} color={t.colors.brandDark} />
              <Text style={styles.syncChipText}>Synced {lastSyncTime || "—"}</Text>
            </View>
          </View>

          {pendingCount > 0 && (
            <Pressable
              testID="dashboard-pending-sync-banner"
              onPress={() => router.push("/sync")}
              style={styles.pendingBanner}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={t.colors.warningText} />
              <Text style={styles.pendingText}>
                {pendingCount} record{pendingCount > 1 ? "s" : ""} waiting for synchronization
              </Text>
              <Ionicons name="chevron-forward" size={16} color={t.colors.warningText} />
            </Pressable>
          )}

          {/* LEAD: today's priority alerts */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleFlush}>Priority alerts</Text>
            <Pressable testID="dashboard-view-all-alerts" onPress={() => router.push("/alerts")} hitSlop={8}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </View>
          {(data?.todays_alerts || []).length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={22} color={t.colors.success} />
              <Text style={styles.emptyText}>Everyone in your area is up to date.</Text>
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
                <Ionicons name="alert-circle" size={18} color={PRIORITY_COLOR[al.priority] || t.colors.info} />
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

          {/* Needs attention: the visit worklist, one grouping instead of three */}
          <Text style={styles.sectionTitle}>Needs attention</Text>
          <View style={styles.grid}>
            <MetricCard
              testID="metric-high-risk"
              title="High-risk pregnancies"
              value={s.high_risk_pregnancies ?? 0}
              icon="alert-circle"
              color={t.colors.error}
              bgColor={t.colors.errorLight}
              onPress={() => router.push("/pregnancy")}
            />
          </View>
          <View style={styles.grid}>
            <MetricCard testID="metric-anc-due" title="ANC due" value={s.anc_due ?? 0} icon="calendar" color={t.colors.warning} onPress={() => router.push("/pregnancy")} />
            <MetricCard testID="metric-anc-overdue" title="ANC overdue" value={s.anc_overdue ?? 0} icon="calendar-clear" color={t.colors.error} onPress={() => router.push("/pregnancy")} />
          </View>
          <View style={styles.grid}>
            <MetricCard testID="metric-mat-vaccine-due" title="Maternal vaccine due" value={s.maternal_vaccine_due ?? 0} icon="medkit" color={t.colors.warning} />
            <MetricCard testID="metric-mat-vaccine-overdue" title="Maternal vaccine overdue" value={s.maternal_vaccine_overdue ?? 0} icon="medkit" color={t.colors.error} />
          </View>
          <View style={styles.grid}>
            <MetricCard testID="metric-child-vaccine-due" title="Child vaccines due" value={s.child_vaccines_due ?? 0} icon="bandage" color={t.colors.warning} onPress={() => router.push("/children")} />
            <MetricCard testID="metric-child-vaccine-overdue" title="Child vaccines overdue" value={s.child_vaccines_overdue ?? 0} icon="bandage" color={t.colors.error} onPress={() => router.push("/children")} />
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick actions</Text>
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

          {/* Recent Registrations */}
          <Text style={styles.sectionTitle}>Recent registrations</Text>
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
                <Text style={styles.recentName} numberOfLines={1}>{p.full_name}</Text>
                <Text style={styles.recentSub} numberOfLines={1}>{p.village} • {p.gestational_age_label}</Text>
              </View>
              {p.is_high_risk && (
                <Ionicons name="warning" size={18} color={t.colors.error} />
              )}
              <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
            </Pressable>
          ))}

          {/* Caseload overview: reference numbers, collapsed by default so the
              screen leads with work, not statistics */}
          <Pressable
            testID="dashboard-caseload-toggle"
            onPress={() => setShowCaseload((v) => !v)}
            style={styles.caseloadHeader}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitleFlush}>Caseload overview</Text>
              {!showCaseload && (
                <Text style={styles.caseloadSummary}>
                  {s.total_pregnancies ?? 0} pregnancies • {s.total_children ?? 0} children registered
                </Text>
              )}
            </View>
            <Ionicons
              name={showCaseload ? "chevron-up" : "chevron-down"}
              size={18}
              color={t.colors.textMuted}
            />
          </Pressable>
          {showCaseload && (
            <View style={styles.caseloadBody}>
              <View style={styles.grid}>
                <MetricCard testID="metric-total-pregnancies" title="Total pregnancies" value={s.total_pregnancies ?? 0} icon="woman" color={t.colors.brandText} onPress={() => router.push("/pregnancy")} />
                <MetricCard testID="metric-children" title="Registered children" value={s.total_children ?? 0} icon="body" color={t.colors.brandText} onPress={() => router.push("/children")} />
              </View>
              <View style={styles.grid}>
                <MetricCard testID="metric-trimester-1" title="1st trimester" value={s.trimester_1 ?? 0} icon="ellipse-outline" color={t.colors.brandDark} />
                <MetricCard testID="metric-trimester-2" title="2nd trimester" value={s.trimester_2 ?? 0} icon="contrast" color={t.colors.brandText} />
                <MetricCard testID="metric-trimester-3" title="3rd trimester" value={s.trimester_3 ?? 0} icon="ellipse" color={t.colors.brandSecondaryText} />
              </View>
              <View style={styles.grid}>
                <MetricCard testID="metric-child-vaccine-done" title="Child vaccines given" value={s.child_vaccines_completed ?? 0} icon="checkmark-done-circle" color={t.colors.success} />
              </View>
            </View>
          )}

          <View style={styles.disclaimerBox}>
            <Ionicons name="shield-checkmark-outline" size={14} color={t.colors.textMuted} />
            <Text style={styles.disclaimerText}>
              Immunisation dates follow a sample schedule. Confirm against the approved national schedule before clinical use.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.surface },
    scroll: { padding: 16, paddingBottom: 32 },
    centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
    loadingText: { color: t.colors.textSecondary, fontSize: 13, marginTop: 8 },
    greetBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: t.colors.heroPanel,
      borderRadius: t.radius.lg,
      padding: 16,
      marginBottom: 4,
    },
    greetText: { flex: 1 },
    greetPlace: { color: t.colors.onHeroPanel, fontSize: 15, fontWeight: "800", lineHeight: 20 },
    greetSector: { color: t.colors.onHeroPanelMuted, fontSize: 12, marginTop: 4 },
    syncChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: t.colors.brandLight, paddingHorizontal: 8, paddingVertical: 6, borderRadius: t.radius.sm },
    syncChipText: { fontSize: 12, fontWeight: "700", color: t.colors.brandDark },
    pendingBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: t.colors.warningLight,
      borderRadius: t.radius.md,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.colors.warningBorder,
    },
    pendingText: { flex: 1, fontSize: 12, fontWeight: "700", color: t.colors.warningText },
    sectionTitle: { fontSize: 15, fontWeight: "800", color: t.colors.textPrimary, marginTop: 24, marginBottom: 10 },
    sectionTitleFlush: { fontSize: 15, fontWeight: "800", color: t.colors.textPrimary },
    sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 10 },
    viewAll: { fontSize: 12, fontWeight: "700", color: t.colors.brandText },
    caseloadHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 24, paddingVertical: 6 },
    caseloadSummary: { fontSize: 12, color: t.colors.textSecondary, marginTop: 3 },
    caseloadBody: { marginTop: 8 },
    grid: { flexDirection: "row", gap: 8 },
    actionRow: { flexDirection: "row", gap: 8 },
    actionTile: {
      flex: 1,
      backgroundColor: t.colors.surfaceSecondary,
      borderRadius: t.radius.md,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 6 },
    actionLabel: { fontSize: 12, fontWeight: "700", color: t.colors.textPrimary, textAlign: "center", lineHeight: 15 },
    emptyCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.colors.successLight, borderRadius: t.radius.md, padding: 14 },
    emptyText: { fontSize: 12, color: t.colors.successText, fontWeight: "600" },
    alertRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: t.colors.surfaceSecondary,
      borderRadius: t.radius.md,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    alertTitle: { fontSize: 14, fontWeight: "700", color: t.colors.textPrimary },
    alertMsg: { fontSize: 12, color: t.colors.textSecondary, marginTop: 2 },
    priorityPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5 },
    priorityText: { fontSize: 12, fontWeight: "800" },
    recentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: t.colors.surfaceSecondary,
      borderRadius: t.radius.md,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.colors.brandLight, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 15, fontWeight: "800", color: t.colors.brandDark },
    recentName: { fontSize: 14, fontWeight: "700", color: t.colors.textPrimary },
    recentSub: { fontSize: 12, color: t.colors.textSecondary, marginTop: 1 },
    disclaimerBox: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20, paddingHorizontal: 4 },
    disclaimerText: { flex: 1, fontSize: 12, color: t.colors.textMuted, fontStyle: "italic" },
  });
