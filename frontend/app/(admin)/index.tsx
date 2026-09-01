import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import type { Theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import { getAdminKpis } from "@/src/api/mch";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const TRIM_COLORS = useMemo(
    () => [t.colors.brandDark, t.colors.brandText, t.colors.brandSecondaryText],
    [t],
  );
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getAdminKpis();
      setData(res);
    } catch (e: any) {
      showToast(e.message || "Failed to load KPIs.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <Header title="Admin Dashboard" showOfflineToggle={false} />
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={t.colors.brand} />
          <Text style={styles.loadingText}>Aggregating district analytics…</Text>
        </View>
      </View>
    );
  }

  const k = data?.kpis || {};
  const trim = data?.trimester_breakdown || {};
  const trimData = [
    { label: "1st Trimester", value: trim.first_trimester || 0 },
    { label: "2nd Trimester", value: trim.second_trimester || 0 },
    { label: "3rd Trimester", value: trim.third_trimester || 0 },
  ];
  const trimMax = Math.max(1, ...trimData.map((d) => d.value));
  const villages = data?.village_stats || [];
  const villageMax = Math.max(1, ...villages.map((v: any) => v.active_pregnancies));
  const workers = data?.worker_performance || [];

  const KPI = (label: string, value: any, icon: keyof typeof Ionicons.glyphMap, color: string, suffix = "") => (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}{suffix}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <Header title="Admin Dashboard" showOfflineToggle={false} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={t.colors.brand} />}
      >
        <View style={styles.greetBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetName} numberOfLines={1}>Siddharthnagar District</Text>
            <Text style={styles.greetSector}>Rampur Block</Text>
          </View>
          <Ionicons name="analytics" size={28} color={t.colors.brandText} />
        </View>

        <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
        <View style={styles.kpiGrid}>
          {KPI("Health Workers", k.total_health_workers ?? 0, "people", t.colors.brandText)}
          {KPI("Total Pregnancies", k.total_pregnancies ?? 0, "woman", t.colors.brandText)}
          {KPI("Active", k.active_pregnancies ?? 0, "pulse", t.colors.success)}
          {KPI("High Risk", k.high_risk_pregnancies ?? 0, "warning", t.colors.error)}
          {KPI("High Risk Rate", k.high_risk_rate_percent ?? 0, "trending-up", t.colors.error, "%")}
          {KPI("Delivered", k.delivered_pregnancies ?? 0, "checkmark-done", t.colors.success)}
          {KPI("Total Children", k.total_children ?? 0, "body", t.colors.brandText)}
          {KPI("Vaccines Given", k.child_vaccines_done ?? 0, "medkit", t.colors.success)}
          {KPI("Immun. Coverage", k.immunization_coverage_percent ?? 0, "shield-checkmark", t.colors.brandText, "%")}
        </View>

        {/* Trimester distribution */}
        <Text style={styles.sectionTitle}>Trimester Distribution</Text>
        <View style={styles.chartCard}>
          {trimData.map((d, i) => (
            <View key={d.label} style={styles.barRow}>
              <Text style={styles.barLabel}>{d.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(d.value / trimMax) * 100}%`, backgroundColor: TRIM_COLORS[i] }]} />
              </View>
              <Text style={styles.barValue}>{d.value}</Text>
            </View>
          ))}
        </View>

        {/* Village statistics */}
        <Text style={styles.sectionTitle}>Village-wise Active Pregnancies</Text>
        <View style={styles.chartCard}>
          {villages.map((v: any) => (
            <View key={v.village} style={styles.barRow}>
              <Text style={styles.barLabel}>{v.village}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(v.active_pregnancies / villageMax) * 100}%`, backgroundColor: t.colors.brand }]} />
              </View>
              <Text style={styles.barValue}>{v.active_pregnancies}</Text>
            </View>
          ))}
        </View>

        {/* Worker performance */}
        <Text style={styles.sectionTitle}>Health Worker Performance</Text>
        {workers.map((w: any) => (
          <View key={w.worker_id} style={styles.workerCard}>
            <View style={styles.workerTop}>
              <View style={styles.workerAvatar}><Text style={styles.workerAvatarText}>{w.name.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.workerName}>{w.name}</Text>
                <Text style={styles.workerSector}>{w.sector}</Text>
              </View>
              <View style={styles.onlinePill}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Synced</Text>
              </View>
            </View>
            <View style={styles.workerStats}>
              <View style={styles.wStat}><Text style={styles.wStatNum}>{w.registered_pregnancies}</Text><Text style={styles.wStatLabel}>Pregnancies</Text></View>
              <View style={styles.wStat}><Text style={styles.wStatNum}>{w.anc_visits_conducted}</Text><Text style={styles.wStatLabel}>ANC Visits</Text></View>
              <View style={styles.wStat}><Text style={styles.wStatNum}>{w.children_covered}</Text><Text style={styles.wStatLabel}>Children</Text></View>
            </View>
          </View>
        ))}

        <View style={styles.adminActions}>
          <Pressable testID="admin-alerts-btn" onPress={() => router.push("/alerts")} style={styles.adminActionBtn}>
            <Ionicons name="notifications" size={18} color={t.colors.brandDark} />
            <Text style={styles.adminActionText}>View Alerts</Text>
          </Pressable>
          <Pressable testID="admin-notif-btn" onPress={() => router.push("/notifications")} style={styles.adminActionBtn}>
            <Ionicons name="megaphone" size={18} color={t.colors.brandDark} />
            <Text style={styles.adminActionText}>Notifications</Text>
          </Pressable>
        </View>

        <Pressable testID="admin-logout-btn" onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color={t.colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.surface },
    scroll: { padding: 16, paddingBottom: 40 },
    centerFill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    loadingText: { color: t.colors.textSecondary, fontSize: 13 },
    greetBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.colors.heroPanel, borderRadius: t.radius.lg, padding: 16, marginBottom: 8 },
    greetName: { color: t.colors.onHeroPanel, fontSize: 16, fontWeight: "800" },
    greetSector: { color: t.colors.onHeroPanelMuted, fontSize: 12, marginTop: 3 },
    sectionTitle: { fontSize: 15, fontWeight: "800", color: t.colors.textPrimary, marginTop: 20, marginBottom: 10 },
    kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    kpiCard: { width: "31.5%", backgroundColor: t.colors.surfaceSecondary, borderRadius: t.radius.md, padding: 12, borderWidth: 1, borderColor: t.colors.border },
    kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    kpiValue: { fontSize: 20, fontWeight: "800", color: t.colors.textPrimary },
    kpiLabel: { fontSize: 12, color: t.colors.textSecondary, marginTop: 3, fontWeight: "600", lineHeight: 15 },
    chartCard: { backgroundColor: t.colors.surfaceSecondary, borderRadius: t.radius.md, padding: 16, borderWidth: 1, borderColor: t.colors.border },
    barRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    barLabel: { width: 96, fontSize: 12, fontWeight: "700", color: t.colors.textSecondary },
    barTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: t.colors.surfaceTertiary, overflow: "hidden" },
    barFill: { height: 14, borderRadius: 7 },
    barValue: { width: 28, fontSize: 12, fontWeight: "800", color: t.colors.textPrimary, textAlign: "right" },
    workerCard: { backgroundColor: t.colors.surfaceSecondary, borderRadius: t.radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: t.colors.border },
    workerTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    workerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.brandLight, alignItems: "center", justifyContent: "center" },
    workerAvatarText: { fontSize: 16, fontWeight: "800", color: t.colors.brandDark },
    workerName: { fontSize: 14, fontWeight: "700", color: t.colors.textPrimary },
    workerSector: { fontSize: 12, color: t.colors.textSecondary, marginTop: 1 },
    onlinePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: t.colors.successLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 4 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.colors.success },
    onlineText: { fontSize: 11, fontWeight: "800", color: t.colors.successText },
    workerStats: { flexDirection: "row", marginTop: 12, backgroundColor: t.colors.surfaceTertiary, borderRadius: t.radius.sm, padding: 10 },
    wStat: { flex: 1, alignItems: "center" },
    wStatNum: { fontSize: 16, fontWeight: "800", color: t.colors.textPrimary },
    wStatLabel: { fontSize: 12, color: t.colors.textMuted, fontWeight: "700", marginTop: 2 },
    adminActions: { flexDirection: "row", gap: 8, marginTop: 20 },
    adminActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: t.colors.brandLight, borderRadius: t.radius.md, paddingVertical: 12 },
    adminActionText: { fontSize: 12, fontWeight: "700", color: t.colors.brandDark },
    logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: t.colors.errorLight, borderRadius: t.radius.md, paddingVertical: 14, marginTop: 12 },
    logoutText: { fontSize: 14, fontWeight: "800", color: t.colors.error },
  });
