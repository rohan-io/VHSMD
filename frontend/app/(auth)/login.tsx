import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { theme } from "@/src/constants/theme";
import { useAuth } from "@/src/context/AuthContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"Health Worker" | "Administrator" | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter both username/mobile and password");
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      const u = await login(username.trim(), password.trim());
      if (u.role === "Administrator") {
        router.replace("/(admin)");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectRole = (role: "Health Worker" | "Administrator") => {
    setSelectedRole(role);
    setUsername("");
    setPassword("");
    setErrorMsg(null);
  };

  const resetRole = () => {
    setSelectedRole(null);
    setUsername("");
    setPassword("");
    setErrorMsg(null);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Government Branding Bar */}
      <View style={styles.topGovBar}>
        <View style={styles.emblemBadge}>
          <Ionicons name="medical" size={14} color="#FFFFFF" />
        </View>
        <Text style={styles.topGovText}>National Health Mission · State MCHIS Portal</Text>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* App Title & Disclaimer Card */}
        <View style={styles.brandingHeader}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={38} color={theme.colors.brand} />
          </View>
          <Text style={styles.appTitle}>HEALTH CONNECT</Text>
          <Text style={styles.appSubtitle}>
            Maternal & Child Health Worker Field Management System
          </Text>
          <View style={styles.disclaimerPill}>
            <Ionicons name="information-circle" size={13} color={theme.colors.brandDark} />
            <Text style={styles.disclaimerText}>
              Official Field Portal for ANM, ASHA & Supervisory Medical Officers
            </Text>
          </View>
        </View>

        {/* Role selection (shown until a role is chosen) */}
        {!selectedRole && (
          <View style={styles.credSection}>
            <Text style={styles.sectionLabel}>Select your role to continue</Text>
            <View style={styles.credGrid}>
              <Pressable
                testID="role-health-worker"
                onPress={() => selectRole("Health Worker")}
                style={({ pressed }) => [styles.credCard, pressed && styles.pressed]}
              >
                <View style={[styles.credIcon, { backgroundColor: theme.colors.brandLight }]}>
                  <Ionicons name="woman" size={18} color={theme.colors.brandDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.credRole}>Health Worker Login</Text>
                  <Text style={styles.credText}>ANM / ASHA field worker access</Text>
                </View>
                <Ionicons name="chevron-forward-circle-outline" size={20} color={theme.colors.textMuted} />
              </Pressable>

              <Pressable
                testID="role-admin"
                onPress={() => selectRole("Administrator")}
                style={({ pressed }) => [styles.credCard, pressed && styles.pressed]}
              >
                <View style={[styles.credIcon, { backgroundColor: theme.colors.surfaceTertiary }]}>
                  <Ionicons name="shield-checkmark" size={18} color={theme.colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.credRole}>Administrator Login</Text>
                  <Text style={styles.credText}>District / block oversight access</Text>
                </View>
                <Ionicons name="chevron-forward-circle-outline" size={20} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Credentials Form (shown after role selected) */}
        {selectedRole && (
        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <Text style={styles.formTitle}>{selectedRole} Login</Text>
            <Pressable testID="login-change-role-btn" onPress={resetRole} style={styles.changeRoleBtn}>
              <Ionicons name="swap-horizontal" size={14} color={theme.colors.brand} />
              <Text style={styles.changeRoleText}>Change</Text>
            </Pressable>
          </View>

          {errorMsg && (
            <View style={styles.errorContainer} testID="login-error-alert">
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Username / Mobile Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username / Mobile Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                testID="login-username-input"
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                testID="login-password-input"
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                testID="toggle-password-visibility-btn"
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          {/* Remember me & Forgot Password */}
          <View style={styles.rowBetween}>
            <Pressable
              testID="login-remember-me-toggle"
              onPress={() => setRememberMe(!rememberMe)}
              style={styles.rememberRow}
            >
              <Ionicons
                name={rememberMe ? "checkbox" : "square-outline"}
                size={18}
                color={theme.colors.brand}
              />
              <Text style={styles.rememberText}>Remember session</Text>
            </Pressable>

            <Pressable
              testID="login-forgot-password-btn"
              onPress={() => setShowForgotModal(true)}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </View>

          {/* Submit CTA Button */}
          <Pressable
            testID="login-submit-button"
            onPress={handleLogin}
            disabled={submitting || isLoading}
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.pressed,
              (submitting || isLoading) && styles.btnDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Sign In to MCH Portal</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
        )}

        {/* Security & Offline Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="lock-closed" size={14} color={theme.colors.textMuted} />
          <Text style={styles.securityText}>
            Encrypted session · Works offline · v2.6.4
          </Text>
        </View>
      </KeyboardAwareScrollView>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} testID="forgot-password-modal">
            <View style={styles.modalHeader}>
              <Ionicons name="help-buoy-outline" size={24} color={theme.colors.brand} />
              <Text style={styles.modalTitle}>Credential Recovery</Text>
            </View>
            <Text style={styles.modalBody}>
              In field deployment, password resets are authorized by the PHC Medical Officer or
              Block Program Manager.{"\n\n"}
              For this demo prototype, use:{"\n"}
              • Admin: <Text style={styles.bold}>admin / Admin@123</Text>{"\n"}
              • Worker: <Text style={styles.bold}>worker01 / Worker@123</Text>
            </Text>
            <Pressable
              testID="close-forgot-password-modal-btn"
              onPress={() => setShowForgotModal(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>Close & Return to Login</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  topGovBar: {
    backgroundColor: theme.colors.surfaceInverse,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emblemBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  topGovText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  brandingHeader: {
    alignItems: "center",
    marginVertical: 12,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
    paddingHorizontal: 20,
  },
  disclaimerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    marginTop: 10,
  },
  disclaimerText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.brandDark,
    flexShrink: 1,
  },
  credSection: {
    marginTop: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  credGrid: {
    gap: 8,
  },
  credCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  credIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  credRole: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  credText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  credHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
    fontStyle: "italic",
  },
  pressed: {
    opacity: 0.85,
  },
  formCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  formHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  changeRoleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  changeRoleText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.brand,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.errorLight,
    padding: 10,
    borderRadius: theme.radius.sm,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    fontWeight: "600",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    height: "100%",
  },
  eyeBtn: {
    padding: 6,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rememberText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.brand,
  },
  submitBtn: {
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  securityText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.lg,
    padding: 24,
    width: "100%",
    maxWidth: 380,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  modalBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  bold: {
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  modalCloseBtn: {
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
