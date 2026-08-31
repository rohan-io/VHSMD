import React, { useState, useCallback } from "react";
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

import { theme } from "@/src/constants/theme";
import { Header } from "@/src/components/Header";
import { listChildren } from "@/src/api/mch";
import { ChildRecord } from "@/src/types";

const FILTERS = [
  { key: "All", label: "All" },
  { key: "Male", label: "Boys" },
  { key: "Female", label: "Girls" },
];

export default function ChildrenListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ChildRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const load = useCallback(async (searchVal: string, filterVal: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchVal.trim()) params.search = searchVal.trim();
      if (filterVal !== "All") params.gender = filterVal;
      const res = await listChildren(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(search, filter);
    }, [filter])
  );

  const renderItem = ({ item }: { item: ChildRecord }) => {
    const st = item.vaccine_stats;
    const pct = st?.progress_percent ?? 0;
    return (
      <Pressable
        testID={`child-card-${item.id}`}
        onPress={() => router.push(`/child/${item.id}` as any)}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: item.gender === "Female" ? "#FCE7F3" : "#DBEAFE" }]}>
            <Ionicons name={item.gender === "Female" ? "female" : "male"} size={18} color={item.gender === "Female" ? "#BE185D" : "#1D4ED8"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.child_name}</Text>
            <Text style={styles.sub}>C/o {item.mother_name} • {item.age_label}</Text>
          </View>
          {st && st.overdue > 0 ? (
            <View style={styles.overduePill}>
              <Text style={styles.overdueText}>{st.overdue} overdue</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>{st?.completed ?? 0}/{st?.total ?? 0} vaccines</Text>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{item.village}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="scale-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{item.birth_weight} kg birth wt</Text>
          </View>
          <Text style={styles.childId}>{item.child_id}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <Header title="Child Registry" showOfflineToggle />

      <View style={styles.stickyHeader}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            testID="child-search-input"
            style={styles.searchInput}
            placeholder="Search child, mother, ID, village…"
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load(search, filter)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable testID="child-search-clear" onPress={() => { setSearch(""); load("", filter); }}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable key={f.key} testID={`child-filter-${f.key}`} onPress={() => setFilter(f.key)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.countText}>{total} children registered</Text>}
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Ionicons name="body-outline" size={40} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No child records found. Tap + to register a newborn.</Text>
            </View>
          }
        />
      )}

      <Pressable testID="fab-register-child" onPress={() => router.push("/child/register")} style={styles.fab}>
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  stickyHeader: { backgroundColor: theme.colors.surfaceSecondary, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  chipRow: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  chip: { height: 36, flexShrink: 0, justifyContent: "center", paddingHorizontal: 14, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceTertiary, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary },
  chipTextActive: { color: "#FFFFFF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 8, minHeight: 200 },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center" },
  listContent: { padding: 16, paddingBottom: 100 },
  countText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, marginBottom: 10 },
  card: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary },
  sub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  overduePill: { backgroundColor: theme.colors.errorLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  overdueText: { fontSize: 10, fontWeight: "800", color: "#991B1B" },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.colors.surfaceTertiary, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.success },
  progressText: { fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "600" },
  childId: { marginLeft: "auto", fontSize: 10, color: theme.colors.textMuted, fontWeight: "700" },
  fab: { position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.brand, alignItems: "center", justifyContent: "center", shadowColor: theme.colors.brandDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
