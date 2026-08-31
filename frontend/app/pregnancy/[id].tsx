import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { StatusBadge } from "@/src/components/StatusBadge";
import { TrimesterTimeline } from "@/src/components/TrimesterTimeline";
import { useToast } from "@/src/components/Toast";
import { LoadError } from "@/src/components/LoadError";
import { useArmConfirm } from "@/src/hooks/use-arm-confirm";
import { isTrulyDelivered } from "@/src/utils/pregnancy";
import { getPregnancy, completeMaternalImm } from "@/src/api/mch";
import { ANCVisit, MaternalImmunization, PregnancyRecord, ChildRecord } from "@/src/types";

type Tab = "visits" | "vaccines" | "vitals";

export default function PregnancyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();

  const [pregnancy, setPregnancy] = useState<PregnancyRecord | null>(null);
  const [visits, setVisits] = useState<ANCVisit[]>([]);
  const [imms, setImms] = useState<MaternalImmunization[]>([]);
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("visits");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { armedId, confirm } = useArmConfirm();

  const load = useCallback(async () => {
    if (!id) return;
    setLoadFailed(false);
    try {
      const res = await getPregnancy(id);
      setPregnancy(res.pregnancy);
      setVisits(res.visits);
      setImms(res.immunizations);
      setChildren(res.children);
    } catch (e: any) {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const markImm = async (immId: string) => {
    if (!id) return;
    setBusyId(immId);
    try {
      await completeMaternalImm(id, immId);
      showToast("Maternal vaccine marked completed.", "success");
      await load();
    } catch (e: any) {
      showToast(e.message || "Failed to update vaccine.", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <Header title="Pregnancy Record" showBack showOfflineToggle={false} />
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
        </View>
      </View>
    );
  }

  if (loadFailed) {
    return (
      <View style={styles.root}>
        <Header title="Pregnancy Record" showBack showOfflineToggle={false} />
        <LoadError onRetry={() => { setLoading(true); load(); }} testID="pregnancy-detail-error" />
      </View>
    );
  }

  if (!pregnancy) {
    return (
      <View style={styles.root}>
        <Header title="Pregnancy Record" showBack showOfflineToggle={false} />
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>This record could not be found. It may have been removed.</Text>
        </View>
      </View>
    );
  }

  const p = pregnancy;

  return (
    <View style={styles.root}>
      <Header title="Pregnancy Record" showBack showOfflineToggle={false} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{p.full_name?.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{p.full_name}</Text>
              <Text style={styles.sub} numberOfLines={1}>W/o {p.husband_name} • Age {p.age} • {p.blood_group}</Text>
              <Text style={styles.sub}>{p.beneficiary_id}</Text>
            </View>
          </View>
          <View style={styles.bannerMeta}>
            <View style={styles.metaChip}><Ionicons name="call" size={12} color={theme.colors.brandDark} /><Text style={styles.metaChipText}>{p.mobile_number}</Text></View>
            <View style={styles.metaChip}><Ionicons name="location" size={12} color={theme.colors.brandDark} /><Text style={styles.metaChipText}>{p.village}, {p.block}</Text></View>
          </View>
          {p.is_high_risk && (
            <View style={styles.riskBanner}>
              <Ionicons name="warning" size={15} color="#991B1B" />
              <Text style={styles.riskBannerText}>
                HIGH RISK: {(p.high_risk_reasons || []).join(", ") || "Requires close monitoring"}
              </Text>
            </View>
          )}
        </View>

        {/* Trimester Timeline */}
        <TrimesterTimeline
          currentTrimester={p.trimester}
          gestationalWeeks={p.gestational_weeks}
          gestationalDays={p.gestational_days}
          edd={p.edd}
        />

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            testID="record-anc-btn"
            onPress={() => router.push(`/anc/record?pregnancyId=${p.id}&visitNumber=${visits.length + 1}` as any)}
            style={styles.primaryAction}
          >
            <Ionicons name="clipboard" size={16} color="#FFF" />
            <Text style={styles.primaryActionText}>Record ANC Visit</Text>
          </Pressable>
          {!isTrulyDelivered(p) && (
            <Pressable
              testID="register-child-btn"
              onPress={() => router.push(`/child/register?motherId=${p.id}` as any)}
              style={styles.secondaryAction}
            >
              <Ionicons name="person-add" size={16} color={theme.colors.brandDark} />
              <Text style={styles.secondaryActionText}>Register Child</Text>
            </Pressable>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {([["visits", "ANC Visits"], ["vaccines", "Immunisation"], ["vitals", "Vitals"]] as [Tab, string][]).map(([key, label]) => (
            <Pressable key={key} testID={`detail-tab-${key}`} onPress={() => setTab(key)} style={[styles.tabBtn, tab === key && styles.tabBtnActive]}>
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "visits" && (
          <View>
            {visits.length === 0 ? (
              <Text style={styles.emptyText}>No ANC visits recorded yet.</Text>
            ) : (
              visits.map((v) => (
                <View key={v.id} style={styles.recordCard} testID={`anc-visit-${v.id}`}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordTitle}>ANC Visit #{v.visit_number}</Text>
                    <StatusBadge status={v.status} />
                  </View>
                  <Text style={styles.recordSub}>{v.visit_date} • {v.gestational_weeks_at_visit} weeks</Text>
                  <View style={styles.vitalGrid}>
                    <View style={styles.vitalItem}><Text style={styles.vitalLabel}>BP</Text><Text style={styles.vitalVal}>{v.bp_systolic}/{v.bp_diastolic}</Text></View>
                    <View style={styles.vitalItem}><Text style={styles.vitalLabel}>Weight</Text><Text style={styles.vitalVal}>{v.weight} kg</Text></View>
                    <View style={styles.vitalItem}><Text style={styles.vitalLabel}>Hb</Text><Text style={styles.vitalVal}>{v.hemoglobin} g/dL</Text></View>
                    <View style={styles.vitalItem}><Text style={styles.vitalLabel}>FHR</Text><Text style={styles.vitalVal}>{v.fetal_heart_rate}</Text></View>
                  </View>
                  {v.advice ? (
                    <View style={styles.adviceRow}>
                      <Ionicons name="chatbubble-ellipses-outline" size={13} color={theme.colors.textMuted} />
                      <Text style={styles.advice}>{v.advice}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}

        {tab === "vaccines" && (
          <View>
            <Text style={styles.demoNote}>Sample schedule shown. Confirm against the approved national schedule before clinical use.</Text>
            {imms.map((im) => (
              <View key={im.id} style={styles.recordCard} testID={`mat-imm-${im.id}`}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTitle} numberOfLines={1}>{im.vaccine_name}</Text>
                  <StatusBadge status={im.status} />
                </View>
                <Text style={styles.recordSub}>{im.dose} • Due {im.due_date}</Text>
                <Text style={styles.recordDesc}>{im.description}</Text>
                {im.status !== "Completed" && im.status !== "Upcoming" && (
                  <Pressable
                    testID={`complete-mat-imm-${im.id}`}
                    onPress={() => { if (confirm(im.id)) markImm(im.id); }}
                    disabled={busyId === im.id}
                    style={[styles.markBtn, armedId === im.id && styles.markBtnArmed]}
                  >
                    {busyId === im.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name={armedId === im.id ? "checkmark-done-circle" : "checkmark-circle"} size={15} color="#FFF" />
                        <Text style={styles.markBtnText}>{armedId === im.id ? "Tap to confirm" : "Mark Administered"}</Text>
                      </>
                    )}
                  </Pressable>
                )}
                {im.status === "Completed" && im.administration_date ? (
                  <View style={styles.givenRow}>
                    <Ionicons name="checkmark-circle" size={13} color="#065F46" />
                    <Text style={styles.givenText}>Given on {im.administration_date} • Batch {im.batch_number || "—"}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {tab === "vitals" && (
          <View style={styles.recordCard}>
            {[
              ["Gravida / Para", `G${p.gravida} P${p.para}`],
              ["Blood Group", p.blood_group || "—"],
              ["Latest Weight", `${p.weight} kg`],
              ["Blood Pressure", `${p.bp_systolic}/${p.bp_diastolic} mmHg`],
              ["Haemoglobin", `${p.hemoglobin} g/dL`],
              ["LMP", p.lmp],
              ["Registration Date", p.registration_date || "—"],
              ["Existing Conditions", p.existing_conditions || "None"],
              ["Allergies", p.allergies || "None"],
              ["Previous History", p.previous_pregnancy_history || "—"],
              ["Assigned Worker", p.assigned_worker_name || "—"],
            ].map(([label, val], i) => (
              <View key={i} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoVal}>{val}</Text>
              </View>
            ))}
          </View>
        )}

        {children.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Linked Children</Text>
            {children.map((c) => (
              <Pressable key={c.id} testID={`linked-child-${c.id}`} onPress={() => router.push(`/child/${c.id}` as any)} style={styles.childLink}>
                <Ionicons name="people-outline" size={18} color={theme.colors.info} />
                <Text style={styles.childLinkText}>{c.child_name} • {c.age_label}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
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
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.brandLight, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "800", color: theme.colors.brandDark },
  name: { fontSize: 17, fontWeight: "800", color: theme.colors.textPrimary },
  sub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  bannerMeta: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.brandLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: theme.radius.sm },
  metaChipText: { fontSize: 12, fontWeight: "700", color: theme.colors.brandDark },
  riskBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.colors.errorLight, borderRadius: theme.radius.sm, padding: 12, marginTop: 12 },
  riskBannerText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#991B1B" },
  actionRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  primaryAction: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: theme.colors.brand, borderRadius: theme.radius.md, paddingVertical: 12 },
  primaryActionText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  secondaryAction: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: theme.colors.brandLight, borderRadius: theme.radius.md, paddingVertical: 12 },
  secondaryActionText: { color: theme.colors.brandDark, fontSize: 13, fontWeight: "700" },
  tabBar: { flexDirection: "row", backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md, padding: 4, marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: theme.radius.sm, alignItems: "center" },
  tabBtnActive: { backgroundColor: theme.colors.surfaceSecondary, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.brand },
  recordCard: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  recordHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  recordTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  recordSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
  recordDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  vitalGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.sm, padding: 10 },
  vitalItem: { alignItems: "center" },
  vitalLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "700" },
  vitalVal: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: "800", marginTop: 2 },
  adviceRow: { flexDirection: "row", gap: 6, marginTop: 8, alignItems: "flex-start" },
  advice: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },
  demoNote: { fontSize: 12, color: theme.colors.textMuted, fontStyle: "italic", marginBottom: 10 },
  markBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: theme.colors.success, borderRadius: theme.radius.sm, paddingVertical: 12, marginTop: 10 },
  markBtnArmed: { backgroundColor: theme.colors.warning },
  markBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  givenRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  givenText: { flex: 1, fontSize: 12, color: "#065F46", fontWeight: "700" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  infoLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" },
  infoVal: { fontSize: 12, color: theme.colors.textPrimary, fontWeight: "700", flex: 1, textAlign: "right" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 10 },
  childLink: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  childLinkText: { flex: 1, fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
});
