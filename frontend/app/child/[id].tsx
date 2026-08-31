import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { StatusBadge } from "@/src/components/StatusBadge";
import { useToast } from "@/src/components/Toast";
import { LoadError } from "@/src/components/LoadError";
import { useArmConfirm } from "@/src/hooks/use-arm-confirm";
import { getChild, completeChildImm } from "@/src/api/mch";
import { ChildImmunization, ChildRecord, PregnancyRecord } from "@/src/types";

const FILTERS = ["All", "Due", "Overdue", "Completed", "Upcoming"];

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();

  const [child, setChild] = useState<ChildRecord | null>(null);
  const [imms, setImms] = useState<ChildImmunization[]>([]);
  const [mother, setMother] = useState<PregnancyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { armedId, confirm } = useArmConfirm();

  const load = useCallback(async () => {
    if (!id) return;
    setLoadFailed(false);
    try {
      const res = await getChild(id);
      setChild(res.child);
      setImms(res.immunizations);
      setMother(res.mother);
    } catch (e: any) {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markDone = async (immId: string) => {
    if (!id) return;
    setBusyId(immId);
    try {
      await completeChildImm(id, immId);
      showToast("Vaccination marked completed.", "success");
      await load();
    } catch (e: any) {
      showToast(e.message || "Failed to update.", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <Header title="Child Record" showBack showOfflineToggle={false} />
        <View style={styles.centerFill}><ActivityIndicator size="large" color={theme.colors.brand} /></View>
      </View>
    );
  }
  if (loadFailed) {
    return (
      <View style={styles.root}>
        <Header title="Child Record" showBack showOfflineToggle={false} />
        <LoadError onRetry={() => { setLoading(true); load(); }} testID="child-detail-error" />
      </View>
    );
  }

  if (!child) {
    return (
      <View style={styles.root}>
        <Header title="Child Record" showBack showOfflineToggle={false} />
        <View style={styles.centerFill}><Text style={styles.emptyText}>This record could not be found. It may have been removed.</Text></View>
      </View>
    );
  }

  const st = child.vaccine_stats;
  const filtered = filter === "All" ? imms : imms.filter((im) => im.status === filter);
  // A near-full green bar reads as "on track" — don't imply that while doses are overdue.
  const progressColor = (st?.overdue ?? 0) > 0 ? theme.colors.warning : theme.colors.success;

  return (
    <View style={styles.root}>
      <Header title="Child Record" showBack showOfflineToggle={false} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View style={[styles.avatar, { backgroundColor: child.gender === "Female" ? "#FCE7F3" : "#DBEAFE" }]}>
              <Ionicons name={child.gender === "Female" ? "female" : "male"} size={22} color={child.gender === "Female" ? "#BE185D" : "#1D4ED8"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{child.child_name}</Text>
              <Text style={styles.sub}>{child.age_label} • {child.gender}</Text>
              <Text style={styles.sub}>{child.child_id}</Text>
            </View>
          </View>
          <View style={styles.bannerMeta}>
            <View style={styles.metaChip}><Ionicons name="woman" size={12} color={theme.colors.brandDark} /><Text style={styles.metaChipText}>{child.mother_name}</Text></View>
            <View style={styles.metaChip}><Ionicons name="location" size={12} color={theme.colors.brandDark} /><Text style={styles.metaChipText}>{child.village}</Text></View>
            <View style={styles.metaChip}><Ionicons name="calendar" size={12} color={theme.colors.brandDark} /><Text style={styles.metaChipText}>DOB {child.dob}</Text></View>
          </View>
        </View>

        {/* Vaccination progress summary */}
        {st && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Immunisation Progress</Text>
              <Text style={[styles.summaryPct, { color: progressColor }]}>{st.progress_percent}%</Text>
            </View>
            <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${st.progress_percent}%`, backgroundColor: progressColor }]} /></View>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}><Text style={[styles.statNum, { color: theme.colors.success }]}>{st.completed}</Text><Text style={styles.statLabel}>Done</Text></View>
              <View style={styles.statItem}><Text style={[styles.statNum, { color: theme.colors.warning }]}>{st.due}</Text><Text style={styles.statLabel}>Due</Text></View>
              <View style={styles.statItem}><Text style={[styles.statNum, { color: theme.colors.error }]}>{st.overdue}</Text><Text style={styles.statLabel}>Overdue</Text></View>
              <View style={styles.statItem}><Text style={[styles.statNum, { color: theme.colors.textSecondary }]}>{st.total}</Text><Text style={styles.statLabel}>Total</Text></View>
            </View>
          </View>
        )}

        <Text style={styles.demoNote}>Sample schedule shown. Confirm against the approved national schedule before clinical use.</Text>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable key={f} testID={`child-imm-filter-${f}`} onPress={() => setFilter(f)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filtered.map((im) => (
          <View key={im.id} style={styles.vaxCard} testID={`child-imm-${im.id}`}>
            <View style={styles.vaxHeader}>
              <View style={styles.vaxCode}><Text style={styles.vaxCodeText}>{im.vaccine_code}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaxName} numberOfLines={1}>{im.vaccine_name}</Text>
                <Text style={styles.vaxSub}>{im.target_age_label} • Due {im.recommended_due_date}</Text>
              </View>
              <StatusBadge status={im.status} />
            </View>
            {im.status !== "Completed" && im.status !== "Upcoming" && (
              <Pressable
                testID={`mark-child-imm-${im.id}`}
                onPress={() => { if (confirm(im.id)) markDone(im.id); }}
                disabled={busyId === im.id}
                style={[styles.markBtn, armedId === im.id && styles.markBtnArmed]}
              >
                {busyId === im.id ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <>
                    <Ionicons name={armedId === im.id ? "checkmark-done-circle" : "checkmark-circle"} size={15} color="#FFF" />
                    <Text style={styles.markBtnText}>{armedId === im.id ? "Tap to confirm" : "Mark Administered"}</Text>
                  </>
                )}
              </Pressable>
            )}
            {im.status === "Completed" && im.administered_date ? (
              <View style={styles.givenRow}>
                <Ionicons name="checkmark-circle" size={13} color="#065F46" />
                <Text style={styles.givenText}>Given on {im.administered_date} • {im.route} • Batch {im.batch_no || "—"}</Text>
              </View>
            ) : null}
          </View>
        ))}
        {filtered.length === 0 && <Text style={styles.emptyText}>No vaccines in this category.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  scroll: { padding: 16, paddingBottom: 40 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center", padding: 16 },
  banner: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.lg, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  bannerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 17, fontWeight: "800", color: theme.colors.textPrimary },
  sub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  bannerMeta: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.brandLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: theme.radius.sm },
  metaChipText: { fontSize: 12, fontWeight: "700", color: theme.colors.brandDark },
  summaryCard: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  summaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  summaryPct: { fontSize: 18, fontWeight: "800", color: theme.colors.success },
  progressBar: { height: 10, borderRadius: 5, backgroundColor: theme.colors.surfaceTertiary, overflow: "hidden" },
  progressFill: { height: 10, borderRadius: 5, backgroundColor: theme.colors.success },
  summaryStats: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  statItem: { alignItems: "center", flex: 1 },
  statNum: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "700", marginTop: 2 },
  demoNote: { fontSize: 12, color: theme.colors.textMuted, fontStyle: "italic", marginBottom: 10 },
  chipRow: { gap: 8, paddingBottom: 12 },
  chip: { height: 44, flexShrink: 0, justifyContent: "center", paddingHorizontal: 16, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceTertiary, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary },
  chipTextActive: { color: "#FFF" },
  vaxCard: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  vaxHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  vaxCode: { minWidth: 48, height: 30, borderRadius: theme.radius.sm, backgroundColor: theme.colors.brandLight, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  vaxCodeText: { fontSize: 11, fontWeight: "800", color: theme.colors.brandDark },
  vaxName: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  vaxSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  markBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: theme.colors.success, borderRadius: theme.radius.sm, paddingVertical: 12, marginTop: 10 },
  markBtnArmed: { backgroundColor: theme.colors.warning },
  markBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  givenRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  givenText: { flex: 1, fontSize: 12, color: "#065F46", fontWeight: "700" },
});
