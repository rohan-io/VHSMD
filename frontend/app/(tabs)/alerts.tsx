import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { LoadError } from "@/src/components/LoadError";
import { useToast } from "@/src/components/Toast";
import { useArmConfirm } from "@/src/hooks/use-arm-confirm";
import { listAlerts, acknowledgeAlert, recalcAlerts } from "@/src/api/mch";
import { AlertItem } from "@/src/types";

const SEGMENTS = [
  { key: "all", label: "All Alerts", match: () => true },
  { key: "highrisk", label: "High Risk", match: (a: AlertItem) => a.alert_type === "HIGH_RISK_PREGNANCY" || a.alert_type === "EDD_APPROACHING" },
  { key: "anc", label: "Missed ANC", match: (a: AlertItem) => a.alert_type === "MISSED_ANC" },
  { key: "mat", label: "Maternal Vaccine", match: (a: AlertItem) => a.alert_type.startsWith("MATERNAL_VACCINE") },
  { key: "child", label: "Child Vaccine", match: (a: AlertItem) => a.alert_type.startsWith("CHILD_VACCINE") },
];

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: theme.colors.error,
  HIGH: "#EA580C",
  MEDIUM: theme.colors.warning,
  LOW: theme.colors.info,
};

export default function AlertsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [seg, setSeg] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { armedId, confirm } = useArmConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      await recalcAlerts();
      const res = await listAlerts({ status_filter: "ACTIVE" });
      setItems(res.items);
    } catch (e) {
      setItems([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAck = async (id: string) => {
    setBusyId(id);
    try {
      await acknowledgeAlert(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
      showToast("Alert acknowledged and cleared.", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to acknowledge alert.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const segMatch = SEGMENTS.find((s) => s.key === seg)!.match;
  const filtered = items.filter(segMatch);

  const renderItem = ({ item }: { item: AlertItem }) => {
    const color = PRIORITY_COLOR[item.priority] || theme.colors.info;
    return (
      <View style={styles.card} testID={`alert-card-${item.id}`}>
        <View style={[styles.priorityStrip, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <View style={[styles.priorityPill, { backgroundColor: `${color}18` }]}>
              <Text style={[styles.priorityText, { color }]}>{item.priority}</Text>
            </View>
            <Text style={styles.dueDate}>Due {item.due_date}</Text>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.msg}>{item.message}</Text>
          <Text style={styles.worker}>Assigned: {item.assigned_worker_name || "—"}</Text>

          <View style={styles.actions}>
            <Pressable
              testID={`alert-view-${item.id}`}
              onPress={() =>
                item.related_entity_type === "pregnancy"
                  ? router.push(`/pregnancy/${item.related_entity_id}` as any)
                  : router.push(`/child/${item.related_entity_id}` as any)
              }
              style={styles.viewBtn}
            >
              <Ionicons name="eye-outline" size={15} color={theme.colors.brandDark} />
              <Text style={styles.viewBtnText}>View Record</Text>
            </Pressable>
            <Pressable
              testID={`alert-ack-${item.id}`}
              onPress={() => { if (confirm(item.id)) handleAck(item.id); }}
              disabled={busyId === item.id}
              style={[styles.ackBtn, armedId === item.id && styles.ackBtnArmed]}
            >
              {busyId === item.id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name={armedId === item.id ? "checkmark-done" : "checkmark"} size={15} color="#FFF" />
                  <Text style={styles.ackBtnText}>{armedId === item.id ? "Tap to confirm" : "Acknowledge"}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <Header title="Alert Engine" showOfflineToggle />

      <View style={styles.stickyHeader}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {SEGMENTS.map((sgm) => {
            const active = seg === sgm.key;
            const count = items.filter(sgm.match).length;
            return (
              <Pressable key={sgm.key} testID={`alert-segment-${sgm.key}`} onPress={() => setSeg(sgm.key)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{sgm.label} ({count})</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
          <Text style={styles.loadingText}>Running alert engine batches…</Text>
        </View>
      ) : error ? (
        <LoadError onRetry={load} testID="alerts-load-error" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Ionicons name="checkmark-done-circle-outline" size={44} color={theme.colors.success} />
              <Text style={styles.emptyText}>All beneficiary records are up to date. No pending alerts.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  stickyHeader: { backgroundColor: theme.colors.surfaceSecondary, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  chipRow: { gap: 8, paddingHorizontal: 16 },
  chip: { height: 44, flexShrink: 0, justifyContent: "center", paddingHorizontal: 16, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceTertiary, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary },
  chipTextActive: { color: "#FFFFFF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 10, minHeight: 240 },
  loadingText: { color: theme.colors.textSecondary, fontSize: 13 },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center" },
  listContent: { padding: 16, paddingBottom: 32 },
  card: { flexDirection: "row", gap: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  priorityStrip: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  priorityPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  priorityText: { fontSize: 12, fontWeight: "800" },
  dueDate: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "600" },
  title: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  msg: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3, lineHeight: 17 },
  worker: { fontSize: 12, color: theme.colors.textMuted, marginTop: 6, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  viewBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: theme.colors.brandLight, borderRadius: theme.radius.sm, paddingVertical: 12 },
  viewBtnText: { fontSize: 13, fontWeight: "700", color: theme.colors.brandDark },
  ackBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: theme.colors.brand, borderRadius: theme.radius.sm, paddingVertical: 12 },
  ackBtnArmed: { backgroundColor: theme.colors.warning },
  ackBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});
