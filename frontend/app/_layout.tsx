import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/context/AuthContext";
import { OfflineSyncProvider } from "@/src/context/OfflineSyncContext";
import { ToastProvider } from "@/src/components/Toast";

// Disable logbox errors etc
LogBox.ignoreAllLogs(true);

// Keep the native splash visible from cold start until icon fonts register.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AuthProvider>
          <OfflineSyncProvider>
            <ToastProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(admin)" />
                <Stack.Screen name="pregnancy/[id]" />
                <Stack.Screen name="pregnancy/register" />
                <Stack.Screen name="anc/record" />
                <Stack.Screen name="child/[id]" />
                <Stack.Screen name="child/register" />
                <Stack.Screen name="sync" />
                <Stack.Screen name="notifications" />
              </Stack>
            </ToastProvider>
          </OfflineSyncProvider>
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
