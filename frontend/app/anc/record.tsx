import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
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
import { createANCVisit } from "@/src/api/mch";

export default function ANCRecordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isSimulatedOffline, addToOfflineQueue } = useOfflineSync();
  const { pregnancyId, visitNumber } = useLocalSearchParams<{ pregnancyId: string; visitNumber: string }>();

  const [form, setForm] = useState({
    weight: "",
    bp_systolic: "",
    bp_diastolic: "",
    hemoglobin: "",
    fundal_height: "",
    fetal_heart_rate: "140",
    symptoms: "",
    examination_notes: "",
    advice: "",
    next_visit_date: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.weight || !form.bp_systolic || !form.bp_diastolic || !form.hemoglobin) {
      showToast("Weight, BP and Haemoglobin are required.", "error");
      return;
    }
    const payload = {
      pregnancy_id: pregnancyId,
      visit_number: Number(visitNumber) || 1,
      weight: Number(form.weight),
      bp_systolic: Number(form.bp_systolic),
      bp_diastolic: Number(form.bp_diastolic),
      hemoglobin: Number(form.hemoglobin),
      fundal_height: form.fundal_height,
      fetal_heart_rate: Number(form.fetal_heart_rate) || 140,
      symptoms: form.symptoms,
      examination_notes: form.examination_notes,
      advice: form.advice,
      next_visit_date: form.next_visit_date || undefined,
    };
    setSubmitting(true);

    if (isSimulatedOffline) {
      await addToOfflineQueue({
        entity_type: "anc_visit",
        payload,
        worker_id: user?.id || "",
        display_title: `ANC Visit #${payload.visit_number}`,
        display_subtitle: "Queued offline",
      } as any);
      setSubmitting(false);
      showToast("ANC visit saved offline for sync.", "info");
      router.back();
      return;
    }

    try {
      await createANCVisit(pregnancyId!, payload);
      showToast("ANC visit recorded successfully.", "success");
      router.back();
    } catch (e: any) {
      await addToOfflineQueue({
        entity_type: "anc_visit",
        payload,
        worker_id: user?.id || "",
        display_title: `ANC Visit #${payload.visit_number}`,
        display_subtitle: "Pending sync",
      } as any);
      showToast("Server unreachable. Visit saved locally.", "info");
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  const F = (label: string, key: keyof typeof form, ph: string, kt?: any, ml?: boolean) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={`anc-${key}`}
        style={[styles.input, ml && styles.inputMultiline]}
        value={form[key]}
        onChangeText={set(key)}
        placeholder={ph}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={kt}
        multiline={ml}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <Header title={`Record ANC Visit #${visitNumber || ""}`} showBack showOfflineToggle={false} />
      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bottomOffset={20}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={16} color={theme.colors.brand} />
          <Text style={styles.infoText}>High risk auto-flagged if BP ≥ 140/90 or Hb &lt; 9.0 g/dL.</Text>
        </View>

        <Text style={styles.sectionTitle}>Vitals</Text>
        {F("Weight (kg)", "weight", "54", "decimal-pad")}
        <View style={styles.rowTwo}>
          <View style={{ flex: 1 }}>{F("BP Systolic", "bp_systolic", "120", "number-pad")}</View>
          <View style={{ flex: 1 }}>{F("BP Diastolic", "bp_diastolic", "80", "number-pad")}</View>
        </View>
        {F("Haemoglobin (g/dL)", "hemoglobin", "11.5", "decimal-pad")}
        <View style={styles.rowTwo}>
          <View style={{ flex: 1 }}>{F("Fundal Height", "fundal_height", "24 cm")}</View>
          <View style={{ flex: 1 }}>{F("Fetal Heart Rate", "fetal_heart_rate", "140", "number-pad")}</View>
        </View>

        <Text style={styles.sectionTitle}>Assessment</Text>
        {F("Symptoms", "symptoms", "Fetal movements, swelling, etc.", undefined, true)}
        {F("Examination Notes", "examination_notes", "Clinical observations", undefined, true)}
        {F("Advice Given", "advice", "IFA tablets, diet, follow-up", undefined, true)}
        {F("Next Visit Date", "next_visit_date", "YYYY-MM-DD")}
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable testID="anc-submit-btn" onPress={handleSubmit} disabled={submitting} style={[styles.submitBtn, submitting && { opacity: 0.6 }]}>
          {submitting ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name={isSimulatedOffline ? "cloud-offline" : "save"} size={18} color="#FFF" />
              <Text style={styles.submitText}>{isSimulatedOffline ? "Save Offline" : "Save ANC Visit"}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  scroll: { padding: 16, paddingBottom: 40 },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.brandLight, borderRadius: theme.radius.md, padding: 12, marginBottom: 8 },
  infoText: { flex: 1, fontSize: 11, color: theme.colors.brandDark, fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.brand, marginTop: 14, marginBottom: 10 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 6 },
  input: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, height: 46, fontSize: 14, color: theme.colors.textPrimary },
  inputMultiline: { height: 70, paddingTop: 10, textAlignVertical: "top" },
  rowTwo: { flexDirection: "row", gap: 10 },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: theme.colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: theme.colors.border },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.brand, borderRadius: theme.radius.md, height: 52 },
  submitText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
