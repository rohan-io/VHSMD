import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import type { Theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { StatusBadge } from "@/src/components/StatusBadge";
import { LoadError } from "@/src/components/LoadError";
import { listPregnancies } from "@/src/api/mch";
import { PregnancyRecord } from "@/src/types";
import { pregnancyStatusLabel } from "@/src/utils/pregnancy";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "high_risk", label: "High Risk" },
  { key: "t1", label: "1st Trimester" },
  { key: "t2", label: "2nd Trimester" },
  { key: "t3", label: "3rd Trimester" },
  { key: "delivered", label: "Delivered" },
];

export default function PregnancyListScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [items, setItems] = useState<PregnancyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async (searchVal: string, filterVal: string) => {
    setLoading(true);
    setError(false);
    try {
      const params: any = {};
      if (searchVal.trim()) params.search = searchVal.trim();
      if (filterVal === "high_risk") params.high_risk = true;
      else if (filterVal === "t1") params.trimester = 1;
      else if (filterVal === "t2") params.trimester = 2;
      else if (filterVal === "t3") params.trimester = 3;
      else if (filterVal === "delivered") params.status_filter = "delivered";
      const res = await listPregnancies(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setItems([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(search, filter);
    }, [filter])
  );

  const onSearchSubmit = () => load(search, filter);

  const renderItem = ({ item }: { item: PregnancyRecord }) => (
    <Pressable
      testID={`pregnancy-card-${item.id}`}
      onPress={() => router.push(`/pregnancy/${item.id}` as any)}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.full_name?.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
          <Text style={styles.sub} numberOfLines={1}>W/o {item.husband_name || "—"} • Age {item.age}</Text>
        </View>
        {item.is_high_risk ? (
          <View style={styles.riskTag}>
            <Ionicons name="warning" size={12} color={t.colors.errorText} />
            <Text style={styles.riskTagText}>HIGH RISK</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={t.colors.textSecondary} />
          <Text style={styles.metaText}>{item.village}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="pulse-outline" size={13} color={t.colors.textSecondary} />
          <Text style={styles.metaText}>{item.gestational_age_label}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={t.colors.textSecondary} />
          <Text style={styles.metaText}>EDD {item.edd}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <StatusBadge status={pregnancyStatusLabel(item)} />
        <Text style={styles.benId}>{item.beneficiary_id}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <Header title="Pregnancy Registry" showOfflineToggle />

      {/* Sticky search + chips */}
      <View style={styles.stickyHeader}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={t.colors.textMuted} />
          <TextInput
            testID="pregnancy-search-input"
            style={styles.searchInput}
            placeholder="Search name, ID, mobile, village…"
            placeholderTextColor={t.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={onSearchSubmit}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable testID="pregnancy-search-clear" onPress={() => { setSearch(""); load("", filter); }}>
              <Ionicons name="close-circle" size={18} color={t.colors.textMuted} />
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                testID={`pregnancy-filter-${f.key}`}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={t.colors.brand} />
        </View>
      ) : error ? (
        <LoadError onRetry={() => load(search, filter)} testID="pregnancy-load-error" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.countText}>{total} beneficiaries found</Text>
          }
          ListEmptyComponent={
            search.trim() || filter !== "all" ? (
              <View style={styles.centerFill}>
                <Ionicons name="search-outline" size={40} color={t.colors.textMuted} />
                <Text style={styles.emptyText}>No beneficiaries match this search or filter.</Text>
                <Pressable
                  testID="pregnancy-empty-clear"
                  onPress={() => { setSearch(""); setFilter("all"); load("", "all"); }}
                  style={styles.emptyBtn}
                >
                  <Text style={styles.emptyBtnText}>Clear search & filters</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.centerFill}>
                <Ionicons name="clipboard-outline" size={40} color={t.colors.textMuted} />
                <Text style={styles.emptyText}>No pregnancies registered yet.</Text>
                <Pressable
                  testID="pregnancy-empty-register"
                  onPress={() => router.push("/pregnancy/register")}
                  style={styles.emptyBtn}
                >
                  <Ionicons name="add" size={16} color={t.colors.onBrand} />
                  <Text style={styles.emptyBtnText}>Register a pregnancy</Text>
                </Pressable>
              </View>
            )
          }
        />
      )}

      <Pressable
        testID="fab-register-pregnancy"
        onPress={() => router.push("/pregnancy/register")}
        style={styles.fab}
      >
        <Ionicons name="add" size={26} color={t.colors.onBrand} />
      </Pressable>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.surface },
    stickyHeader: {
      backgroundColor: t.colors.surfaceSecondary,
      paddingTop: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      backgroundColor: t.colors.surfaceTertiary,
      borderRadius: t.radius.md,
      paddingHorizontal: 12,
      height: 44,
    },
    searchInput: { flex: 1, fontSize: 14, color: t.colors.textPrimary },
    chipRow: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
    chip: {
      height: 44,
      flexShrink: 0,
      justifyContent: "center",
      paddingHorizontal: 16,
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.surfaceTertiary,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    chipActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
    chipText: { fontSize: 12, fontWeight: "700", color: t.colors.textSecondary },
    chipTextActive: { color: t.colors.onBrand },
    centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 10, minHeight: 200 },
    emptyText: { fontSize: 13, color: t.colors.textSecondary, textAlign: "center" },
    emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, backgroundColor: t.colors.brand, borderRadius: t.radius.md, paddingHorizontal: 16, paddingVertical: 10 },
    emptyBtnText: { color: t.colors.onBrand, fontSize: 13, fontWeight: "700" },
    listContent: { padding: 16, paddingBottom: 100 },
    countText: { fontSize: 12, fontWeight: "700", color: t.colors.textSecondary, marginBottom: 10 },
    card: {
      backgroundColor: t.colors.surfaceSecondary,
      borderRadius: t.radius.md,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: t.colors.brandLight, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 17, fontWeight: "800", color: t.colors.brandDark },
    name: { fontSize: 15, fontWeight: "700", color: t.colors.textPrimary },
    sub: { fontSize: 12, color: t.colors.textSecondary, marginTop: 1 },
    riskTag: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: t.colors.errorLight, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 4 },
    riskTagText: { fontSize: 12, fontWeight: "800", color: t.colors.errorText },
    cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 12, color: t.colors.textSecondary, fontWeight: "600" },
    cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    benId: { fontSize: 11, color: t.colors.textMuted, fontWeight: "700" },
    fab: {
      position: "absolute",
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.colors.brand,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: t.colors.brandDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  });
