import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { useToast } from "@/src/components/Toast";
import { useOfflineSync } from "@/src/context/OfflineSyncContext";

const ENTITY_ICON: Record<string, keyof typeof import("@expo/vector-icons").Ionicons.glyphMap> = {
  pregnancy: "woman",
  anc_visit: "clipboard",
  child: "happy",
  child_imm: "bandage",
  maternal_imm: "medkit",
};

export default function SyncScreen() {
  const { showToast } = useToast();
  const {
    isSimulatedOffline,
    toggleSimulatedOffline,
    pendingItems,
    pendingCount,
    lastSyncTime,
    isSyncing,
    syncNow,
    clearQueue,
  } = useOfflineSync();

  const [localSyncing, setLocalSyncing] = useState(false);

  const handleSync = async () => {
    setLocalSyncing(true);
    const res = await syncNow();
    setLocalSyncing(false);
    showToast(res.message, res.success ? "success" : "error");
  };

  return (
    <View style={styles.root}>
      <Header title="Offline Sync Center" showBack showOfflineToggle={false} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Connection status */}
        <View style={[styles.statusCard, isSimulatedOffline ? styles.statusOffline : styles.statusOnline]}>
          <Ionicons name={isSimulatedOffline ? "cloud-offline" : "cloud-done"} size={30} color={isSimulatedOffline ? theme.colors.error : theme.colors.success} />
          <Text style={[styles.statusTitle, { color: isSimulatedOffline ? "#991B1B" : "#065F46" }]}>
            {isSimulatedOffline ? "Simulated Offline Mode" : "Connected to Central Server"}
          </Text>
          <Text style={styles.statusSub}>Last synchronized: {lastSyncTime || "—"}</Text>
        </View>

        {/* Offline toggle */}
        <View style={styles.toggleCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Simulate Offline Field Conditions</Text>
            <Text style={styles.toggleSub}>New records are queued locally until sync.</Text>
          </View>
          <Switch
            testID="sync-offline-switch"
            value={isSimulatedOffline}
            onValueChange={toggleSimulatedOffline}
            trackColor={{ false: theme.colors.borderStrong, true: "#FCA5A5" }}
            thumbColor={isSimulatedOffline ? theme.colors.error : "#FFFFFF"}
          />
        </View>

        {/* Sync Now */}
        <Pressable
          testID="sync-now-btn"
          onPress={handleSync}
          disabled={isSyncing || localSyncing}
          style={[styles.syncBtn, (isSyncing || localSyncing) && { opacity: 0.7 }]}
        >
          {isSyncing || localSyncing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="sync" size={20} color="#FFF" />
              <Text style={styles.syncBtnText}>Sync Now ({pendingCount})</Text>
            </>
          )}
        </Pressable>

        {/* Queue */}
        <View style={styles.queueHeader}>
          <Text style={styles.sectionTitle}>Pending Sync Queue</Text>
          {pendingCount > 0 && (
            <Pressable testID="sync-clear-btn" onPress={async () => { await clearQueue(); showToast("Queue cleared.", "info"); }}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {pendingCount === 0 ? (
          <View style={styles.emptyCard} testID="sync-empty">
            <Ionicons name="checkmark-done-circle-outline" size={40} color={theme.colors.success} />
            <Text style={styles.emptyText}>Offline queue is empty. All records synchronized.</Text>
          </View>
        ) : (
          pendingItems.map((item) => (
            <View key={item.client_txn_id} style={styles.queueItem} testID={`sync-item-${item.client_txn_id}`}>
              <View style={styles.queueIcon}>
                <Ionicons name={ENTITY_ICON[item.entity_type] || "document"} size={18} color={theme.colors.brandDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueTitle}>{item.display_title}</Text>
                <Text style={styles.queueSub}>{item.display_subtitle}</Text>
                <Text style={styles.queueTime}>{new Date(item.timestamp).toLocaleString()}</Text>
              </View>
              <View style={styles.waitingPill}>
                <Ionicons name="time" size={11} color="#B45309" />
                <Text style={styles.waitingText}>Waiting</Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.flowNote}>
          <Text style={styles.flowTitle}>How offline sync works</Text>
          <Text style={styles.flowText}>Local Queue → Internet Available → REST API → Central Database. Records are de-duplicated on the server to prevent double entries.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  scroll: { padding: 16, paddingBottom: 40 },
  statusCard: { alignItems: "center", borderRadius: theme.radius.lg, padding: 20, borderWidth: 1, gap: 4 },
  statusOnline: { backgroundColor: theme.colors.successLight, borderColor: "#A7F3D0" },
  statusOffline: { backgroundColor: theme.colors.errorLight, borderColor: "#FECACA" },
  statusTitle: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  statusSub: { fontSize: 12, color: theme.colors.textSecondary },
  toggleCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 14, borderWidth: 1, borderColor: theme.colors.border, marginTop: 12 },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  toggleSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  syncBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.brand, borderRadius: theme.radius.md, height: 52, marginTop: 12 },
  syncBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  queueHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.textPrimary },
  clearText: { fontSize: 12, fontWeight: "700", color: theme.colors.error },
  emptyCard: { alignItems: "center", gap: 8, padding: 30, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, marginTop: 12 },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center" },
  queueItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 14, marginTop: 10, borderWidth: 1, borderColor: theme.colors.border },
  queueIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.brandLight, alignItems: "center", justifyContent: "center" },
  queueTitle: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
  queueSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  queueTime: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  waitingPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: theme.colors.warningLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  waitingText: { fontSize: 10, fontWeight: "800", color: "#B45309" },
  flowNote: { marginTop: 20, backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md, padding: 14, borderLeftWidth: 3, borderLeftColor: theme.colors.brand },
  flowTitle: { fontSize: 12, fontWeight: "800", color: theme.colors.textPrimary },
  flowText: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 16 },
});
