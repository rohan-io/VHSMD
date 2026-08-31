import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { theme } from "@/src/constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === "Administrator") {
          router.replace("/(admin)");
        } else {
          router.replace("/(tabs)");
        }
      } else {
        router.replace("/(auth)/login");
      }
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container} testID="splash-loading-screen">
      <View style={styles.logoBadge}>
        <Ionicons name="medical" size={36} color="#FFFFFF" />
      </View>
      <Text style={styles.title}>HEALTH CONNECT</Text>
      <Text style={styles.subtitle}>Maternal & Child Health Information System</Text>
      <ActivityIndicator size="large" color={theme.colors.brand} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: theme.colors.brandDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
});
