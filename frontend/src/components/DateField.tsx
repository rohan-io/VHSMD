import React from "react";
import { Platform, TextInput, View, Text, StyleSheet } from "react-native";
import { theme } from "@/src/constants/theme";
import { maskDateInput } from "@/src/utils/date";

interface Props {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  min?: string; // "YYYY-MM-DD"
  max?: string;
  placeholder?: string;
  error?: string | null;
  testID?: string;
}

/**
 * Web gets the real platform date picker (react-native-web renders this subtree
 * as DOM, so a native <input type="date"> works). Native falls back to a masked,
 * numeric-keypad text field; the parent still validates the value either way.
 */
export const DateField: React.FC<Props> = ({
  value,
  onChange,
  min,
  max,
  placeholder = "YYYY-MM-DD",
  error,
  testID,
}) => {
  return (
    <View>
      {Platform.OS === "web"
        ? React.createElement("input", {
            type: "date",
            value: value || "",
            min,
            max,
            "data-testid": testID,
            onChange: (e: any) => onChange(e.target.value),
            style: {
              boxSizing: "border-box",
              width: "100%",
              height: 46,
              borderRadius: theme.radius.md,
              border: `1px solid ${error ? theme.colors.error : theme.colors.border}`,
              padding: "0 12px",
              fontSize: 14,
              fontFamily: "inherit",
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surfaceSecondary,
              accentColor: theme.colors.brand,
            },
          })
        : (
          <TextInput
            testID={testID}
            style={[styles.input, error ? styles.inputError : null]}
            value={value}
            onChangeText={(t) => onChange(maskDateInput(t))}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
          />
        )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  inputError: { borderColor: theme.colors.error },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    fontWeight: "600",
    marginTop: 4,
  },
});
