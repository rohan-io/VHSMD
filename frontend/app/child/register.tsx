import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/AuthContext";
import { useOfflineSync } from "@/src/context/OfflineSyncContext";
import { createChild, listPregnancies, getPregnancy } from "@/src/api/mch";
import { PregnancyRecord } from "@/src/types";

export default function RegisterChildScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isSimulatedOffline, addToOfflineQueue } = useOfflineSync();
  const { motherId } = useLocalSearchParams<{ motherId: string }>();

  const [mother, setMother] = useState<{ id: string; name: string; village: string } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [mothers, setMothers] = useState<PregnancyRecord[]>([]);
  const [motherSearch, setMotherSearch] = useState("");

  const [form, setForm] = useState({
    child_name: "",
    dob: "",
    birth_weight: "3.0",
    place_of_birth: "PHC Hospital",
  });
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (motherId) {
      getPregnancy(motherId).then((res) => {
        setMother({ id: res.pregnancy.id, name: res.pregnancy.full_name, village: res.pregnancy.village });
      }).catch(() => {});
    }
  }, [motherId]);

  const openPicker = async () => {
    setShowPicker(true);
    try {
      const res = await listPregnancies({});
      setMothers(res.items);
    } catch {}
  };

  const filteredMothers = mothers.filter((m) =>
    m.full_name.toLowerCase().includes(motherSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!mother) { showToast("Please select the mother.", "error"); return; }
    if (!form.child_name.trim()) { showToast("Child name is required.", "error"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dob.trim())) { showToast("DOB must be YYYY-MM-DD.", "error"); return; }

    const payload = {
      mother_id: mother.id,
      child_name: form.child_name.trim(),
      gender,
      dob: form.dob.trim(),
      birth_weight: Number(form.birth_weight) || 3.0,
      place_of_birth: form.place_of_birth.trim(),
      village: mother.village,
    };
    setSubmitting(true);

    if (isSimulatedOffline) {
      await addToOfflineQueue({
        entity_type: "child",
        payload,
        worker_id: user?.id || "",
        display_title: `Child: ${payload.child_name}`,
        display_subtitle: `Mother: ${mother.name} • Queued offline`,
      } as any);
      setSubmitting(false);
      showToast("Child saved offline for sync.", "info");
      router.back();
      return;
    }

    try {
      await createChild(payload);
      showToast("Child registered successfully.", "success");
      router.back();
    } catch (e: any) {
      await addToOfflineQueue({
        entity_type: "child",
        payload,
        worker_id: user?.id || "",
        display_title: `Child: ${payload.child_name}`,
        display_subtitle: `Mother: ${mother.name} • Pending sync`,
      } as any);
      showToast("Server unreachable. Child saved locally.", "info");
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <Header title="Register Child" showBack showOfflineToggle={false} />
      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bottomOffset={20}>
        <Text style={styles.sectionTitle}>Link to Mother</Text>
        <Pressable testID="child-select-mother-btn" onPress={openPicker} style={styles.motherSelect}>
          <Ionicons name="woman" size={18} color={theme.colors.brand} />
          <Text style={[styles.motherSelectText, !mother && { color: theme.colors.textMuted }]}>
            {mother ? `${mother.name} (${mother.village})` : "Select mother / beneficiary"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
        </Pressable>

        <Text style={styles.sectionTitle}>Child Details</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Child Name</Text>
          <TextInput testID="child-name-input" style={styles.input} value={form.child_name} onChangeText={set("child_name")} placeholder="e.g. Aarav Kumar" placeholderTextColor={theme.colors.textMuted} />
        </View>

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {(["Male", "Female"] as const).map((g) => (
            <Pressable key={g} testID={`child-gender-${g}`} onPress={() => setGender(g)} style={[styles.genderChip, gender === g && styles.genderChipActive]}>
              <Ionicons name={g === "Male" ? "male" : "female"} size={16} color={gender === g ? "#FFF" : theme.colors.textSecondary} />
              <Text style={[styles.genderText, gender === g && { color: "#FFF" }]}>{g}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput testID="child-dob-input" style={styles.input} value={form.dob} onChangeText={set("dob")} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textMuted} />
        </View>
        <View style={styles.rowTwo}>
          <View style={{ flex: 1 }}>
            <View style={styles.field}>
              <Text style={styles.label}>Birth Weight (kg)</Text>
              <TextInput testID="child-weight-input" style={styles.input} value={form.birth_weight} onChangeText={set("birth_weight")} placeholder="3.0" keyboardType="decimal-pad" placeholderTextColor={theme.colors.textMuted} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.field}>
              <Text style={styles.label}>Place of Birth</Text>
              <TextInput testID="child-place-input" style={styles.input} value={form.place_of_birth} onChangeText={set("place_of_birth")} placeholder="PHC Hospital" placeholderTextColor={theme.colors.textMuted} />
            </View>
          </View>
        </View>
        <Text style={styles.hint}>Full immunisation schedule is auto-generated from DOB.</Text>
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable testID="child-submit-btn" onPress={handleSubmit} disabled={submitting} style={[styles.submitBtn, submitting && { opacity: 0.6 }]}>
          {submitting ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name={isSimulatedOffline ? "cloud-offline" : "save"} size={18} color="#FFF" />
              <Text style={styles.submitText}>{isSimulatedOffline ? "Save Offline" : "Register Child"}</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Mother</Text>
            <View style={styles.modalSearch}>
              <Ionicons name="search" size={16} color={theme.colors.textMuted} />
              <TextInput testID="mother-picker-search" style={styles.modalSearchInput} placeholder="Search mother name…" placeholderTextColor={theme.colors.textMuted} value={motherSearch} onChangeText={setMotherSearch} />
            </View>
            <FlatList
              data={filteredMothers}
              keyExtractor={(i) => i.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <Pressable
                  testID={`mother-option-${item.id}`}
                  onPress={() => { setMother({ id: item.id, name: item.full_name, village: item.village }); setShowPicker(false); setMotherSearch(""); }}
                  style={styles.motherOption}
                >
                  <View style={styles.optAvatar}><Text style={styles.optAvatarText}>{item.full_name.charAt(0)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optName}>{item.full_name}</Text>
                    <Text style={styles.optSub}>{item.village} • {item.status === "delivered" ? "Delivered" : item.gestational_age_label}</Text>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.hint}>No mothers found.</Text>}
            />
            <Pressable testID="mother-picker-close" onPress={() => setShowPicker(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.brand, marginTop: 14, marginBottom: 10 },
  motherSelect: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, height: 50 },
  motherSelectText: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 6 },
  input: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, height: 46, fontSize: 14, color: theme.colors.textPrimary },
  rowTwo: { flexDirection: "row", gap: 10 },
  hint: { fontSize: 11, color: theme.colors.textMuted, fontStyle: "italic", marginTop: 4 },
  genderRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  genderChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 46, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border },
  genderChipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  genderText: { fontSize: 14, fontWeight: "700", color: theme.colors.textSecondary },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: theme.colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: theme.colors.border },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.brand, borderRadius: theme.radius.md, height: 52 },
  submitText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: theme.colors.surfaceSecondary, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, padding: 16 },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderStrong, marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 12 },
  modalSearch: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  modalSearchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  motherOption: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  optAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.brandLight, alignItems: "center", justifyContent: "center" },
  optAvatarText: { fontSize: 15, fontWeight: "800", color: theme.colors.brandDark },
  optName: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  optSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  modalClose: { marginTop: 12, backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md, paddingVertical: 12, alignItems: "center" },
  modalCloseText: { fontSize: 14, fontWeight: "700", color: theme.colors.textSecondary },
});
