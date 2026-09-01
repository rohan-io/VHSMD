import React, { useMemo, useState } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import type { Theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { DateField } from "@/src/components/DateField";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/AuthContext";
import { useOfflineSync } from "@/src/context/OfflineSyncContext";
import { createPregnancy } from "@/src/api/mch";
import { validateDate, shiftISO, todayISO } from "@/src/utils/date";

// A plausible LMP sits within the last ~43 weeks and never in the future.
const LMP_MIN = shiftISO(-300);
const LMP_MAX = todayISO();

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  testID: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
}
// Top-level (stable identity — no remount on keystroke) but theme-aware.
const Field: React.FC<FieldProps> = ({ label, value, onChangeText, placeholder, keyboardType, testID, required, multiline, maxLength }) => {
  const t = useTheme();
  const styles = useMemo(() => makeFieldStyles(t), [t]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? <Text style={{ color: t.colors.error }}> *</Text> : null}</Text>
      <TextInput
        testID={testID}
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength ?? (multiline ? 300 : 80)}
      />
    </View>
  );
};

export default function RegisterPregnancyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isSimulatedOffline, addToOfflineQueue } = useOfflineSync();

  const [form, setForm] = useState({
    full_name: "",
    husband_name: "",
    age: "",
    mobile_number: "",
    village: "",
    address: "",
    lmp: "",
    gravida: "1",
    para: "0",
    blood_group: "O+",
    weight: "",
    bp_systolic: "",
    bp_diastolic: "",
    hemoglobin: "",
    existing_conditions: "",
    previous_pregnancy_history: "",
  });
  const [highRisk, setHighRisk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lmpError, setLmpError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const setLmp = (v: string) => {
    setForm((f) => ({ ...f, lmp: v }));
    if (lmpError) setLmpError(null);
  };

  const validate = () => {
    if (!form.full_name.trim()) return "Full name is required.";
    const age = Number(form.age);
    if (!form.age.trim() || isNaN(age) || age < 10 || age > 60) return "Enter a valid age between 10 and 60.";
    if (!/^\d{10}$/.test(form.mobile_number.trim())) return "Enter a valid 10-digit mobile number.";
    if (!form.village.trim()) return "Village is required.";
    const lmpMsg = validateDate(form.lmp, { min: LMP_MIN, max: LMP_MAX, label: "LMP" });
    if (lmpMsg) { setLmpError(lmpMsg); return lmpMsg; }
    return null;
  };

  const buildPayload = () => ({
    full_name: form.full_name.trim(),
    husband_name: form.husband_name.trim(),
    age: Number(form.age),
    mobile_number: form.mobile_number.trim(),
    village: form.village.trim(),
    address: form.address.trim() || form.village.trim(),
    lmp: form.lmp.trim(),
    gravida: Number(form.gravida) || 1,
    para: Number(form.para) || 0,
    blood_group: form.blood_group,
    weight: Number(form.weight) || 50,
    bp_systolic: Number(form.bp_systolic) || 120,
    bp_diastolic: Number(form.bp_diastolic) || 80,
    hemoglobin: Number(form.hemoglobin) || 11,
    existing_conditions: form.existing_conditions.trim(),
    previous_pregnancy_history: form.previous_pregnancy_history.trim(),
    is_high_risk: highRisk,
    assigned_worker_id: user?.id || "",
    assigned_worker_name: user?.name || "",
  });

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      showToast(err, "error");
      return;
    }
    const payload = buildPayload();
    setSubmitting(true);

    if (isSimulatedOffline) {
      await addToOfflineQueue({
        entity_type: "pregnancy",
        payload,
        worker_id: user?.id || "",
        display_title: `Pregnancy: ${payload.full_name}`,
        display_subtitle: `${payload.village} • Queued offline`,
      } as any);
      setSubmitting(false);
      showToast("Saved offline. Will sync when back online.", "info");
      router.back();
      return;
    }

    try {
      await createPregnancy(payload);
      showToast("Pregnancy registered successfully.", "success");
      router.back();
    } catch (e: any) {
      // Fallback: keep record safe in offline queue
      await addToOfflineQueue({
        entity_type: "pregnancy",
        payload,
        worker_id: user?.id || "",
        display_title: `Pregnancy: ${payload.full_name}`,
        display_subtitle: `${payload.village} • Pending sync`,
      } as any);
      showToast("Server unreachable. Record saved locally for sync.", "info");
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <Header title="Register Pregnancy" showBack showOfflineToggle={false} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <Field testID="reg-full-name" label="Full Name" value={form.full_name} onChangeText={set("full_name")} placeholder="e.g. Sunita Devi" required />
        <Field testID="reg-husband-name" label="Husband's Name" value={form.husband_name} onChangeText={set("husband_name")} placeholder="e.g. Rajesh Kumar" />
        <View style={styles.rowTwo}>
          <View style={{ flex: 1 }}><Field testID="reg-age" label="Age" value={form.age} onChangeText={set("age")} placeholder="24" keyboardType="number-pad" required /></View>
          <View style={{ flex: 1 }}><Field testID="reg-mobile" label="Mobile Number" value={form.mobile_number} onChangeText={set("mobile_number")} placeholder="98xxxxxxxx" keyboardType="phone-pad" required /></View>
        </View>
        <Field testID="reg-village" label="Village" value={form.village} onChangeText={set("village")} placeholder="e.g. Rampur" required />
        <Field testID="reg-address" label="Address" value={form.address} onChangeText={set("address")} placeholder="House no, locality" />

        <Text style={styles.sectionTitle}>Pregnancy Information</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Last Menstrual Period (LMP)<Text style={{ color: t.colors.error }}> *</Text></Text>
          <DateField
            testID="reg-lmp"
            value={form.lmp}
            onChange={setLmp}
            min={LMP_MIN}
            max={LMP_MAX}
            error={lmpError}
          />
        </View>
        <Text style={styles.hint}>EDD & trimester are auto-calculated from LMP.</Text>
        <View style={styles.rowTwo}>
          <View style={{ flex: 1 }}><Field testID="reg-gravida" label="Gravida" value={form.gravida} onChangeText={set("gravida")} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field testID="reg-para" label="Para" value={form.para} onChangeText={set("para")} keyboardType="number-pad" /></View>
        </View>

        <Text style={styles.label}>Blood Group</Text>
        <View style={styles.bgRow}>
          {BLOOD_GROUPS.map((bg) => (
            <Pressable key={bg} testID={`reg-bg-${bg}`} onPress={() => set("blood_group")(bg)} style={[styles.bgChip, form.blood_group === bg && styles.bgChipActive]}>
              <Text style={[styles.bgChipText, form.blood_group === bg && styles.bgChipTextActive]}>{bg}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Health Information</Text>
        <Field testID="reg-weight" label="Weight (kg)" value={form.weight} onChangeText={set("weight")} placeholder="52" keyboardType="decimal-pad" />
        <View style={styles.rowTwo}>
          <View style={{ flex: 1 }}><Field testID="reg-bp-sys" label="BP Systolic" value={form.bp_systolic} onChangeText={set("bp_systolic")} placeholder="120" keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field testID="reg-bp-dia" label="BP Diastolic" value={form.bp_diastolic} onChangeText={set("bp_diastolic")} placeholder="80" keyboardType="number-pad" /></View>
        </View>
        <Field testID="reg-hb" label="Haemoglobin (g/dL)" value={form.hemoglobin} onChangeText={set("hemoglobin")} placeholder="11.5" keyboardType="decimal-pad" />
        <Field testID="reg-conditions" label="Existing Conditions" value={form.existing_conditions} onChangeText={set("existing_conditions")} placeholder="Diabetes, thyroid, etc." multiline />
        <Field testID="reg-history" label="Previous Pregnancy History" value={form.previous_pregnancy_history} onChangeText={set("previous_pregnancy_history")} placeholder="C-section, complications, etc." multiline />

        <Pressable testID="reg-high-risk-toggle" onPress={() => setHighRisk(!highRisk)} style={styles.riskToggle}>
          <Ionicons name={highRisk ? "checkbox" : "square-outline"} size={22} color={highRisk ? t.colors.error : t.colors.textMuted} />
          <Text style={styles.riskToggleText}>Manually flag as High Risk Pregnancy</Text>
        </Pressable>
        <Text style={styles.hint}>System also auto-detects risk from age, BP, Hb, gravida & history.</Text>
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable testID="reg-submit-btn" onPress={handleSubmit} disabled={submitting} style={[styles.submitBtn, submitting && { opacity: 0.6 }]}>
          {submitting ? (
            <ActivityIndicator color={t.colors.onBrand} />
          ) : (
            <>
              <Ionicons name={isSimulatedOffline ? "cloud-offline" : "save"} size={18} color={t.colors.onBrand} />
              <Text style={styles.submitText}>{isSimulatedOffline ? "Save Offline" : "Register Pregnancy"}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const makeFieldStyles = (t: Theme) =>
  StyleSheet.create({
    field: { marginBottom: 12 },
    label: { fontSize: 12, fontWeight: "700", color: t.colors.textPrimary, marginBottom: 6 },
    input: { backgroundColor: t.colors.surfaceSecondary, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: 12, height: 46, fontSize: 14, color: t.colors.textPrimary },
    inputMultiline: { height: 70, paddingTop: 10, textAlignVertical: "top" },
  });

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.surface },
    scroll: { padding: 16, paddingBottom: 40 },
    sectionTitle: { fontSize: 14, fontWeight: "800", color: t.colors.brandText, marginTop: 16, marginBottom: 10 },
    field: { marginBottom: 12 },
    label: { fontSize: 12, fontWeight: "700", color: t.colors.textPrimary, marginBottom: 6 },
    rowTwo: { flexDirection: "row", gap: 10 },
    hint: { fontSize: 12, color: t.colors.textMuted, marginTop: -4, marginBottom: 8, fontStyle: "italic" },
    bgRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    bgChip: { width: 54, height: 44, borderRadius: t.radius.sm, backgroundColor: t.colors.surfaceSecondary, borderWidth: 1, borderColor: t.colors.border, alignItems: "center", justifyContent: "center" },
    bgChipActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
    bgChipText: { fontSize: 13, fontWeight: "700", color: t.colors.textSecondary },
    bgChipTextActive: { color: t.colors.onBrand },
    riskToggle: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: t.colors.surfaceSecondary, borderRadius: t.radius.md, padding: 12, borderWidth: 1, borderColor: t.colors.border },
    riskToggleText: { fontSize: 13, fontWeight: "700", color: t.colors.textPrimary },
    footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: t.colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: t.colors.border },
    submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: t.colors.brand, borderRadius: t.radius.md, height: 52 },
    submitText: { color: t.colors.onBrand, fontSize: 15, fontWeight: "700" },
  });
