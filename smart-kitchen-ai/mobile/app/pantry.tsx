import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Search,
  Plus,
  X,
  Package,
  AlertTriangle,
  CalendarDays,
  Check,
} from "lucide-react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  green: "#39845A",
};

type Filter = "all" | "expiring" | "expired";

type Ingredient = {
  id: string;
  emoji: string;
  name: string;
  quantity: string;
  unit: string;
  expiry: string;
};

const initialIngredients: Ingredient[] = [
  {
    id: "1",
    emoji: "🥬",
    name: "Cải xanh",
    quantity: "300",
    unit: "g",
    expiry: "2026-10-20",
  },
  {
    id: "2",
    emoji: "🍅",
    name: "Cà chua",
    quantity: "500",
    unit: "g",
    expiry: "2026-10-21",
  },
  {
    id: "3",
    emoji: "🥚",
    name: "Trứng gà",
    quantity: "6",
    unit: "quả",
    expiry: "2026-10-23",
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function daysUntil(date: string) {
  const expiry = parseDate(date);
  if (!expiry) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round((expiry.getTime() - today.getTime()) / DAY_MS);
}

function getStatus(item: Ingredient) {
  const days = daysUntil(item.expiry);

  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= 3) return "expiring";

  return "fresh";
}

function formatExpiry(date: string) {
  const days = daysUntil(date);

  if (days === null) return "Chưa rõ hạn sử dụng";
  if (days < 0) return "Đã hết hạn";
  if (days === 0) return "Hết hạn hôm nay";
  if (days === 1) return "Hết hạn ngày mai";

  const [year, month, day] = date.split("-");
  return `Hạn ${day}/${month}/${year}`;
}

export default function PantryScreen() {
  const router = useRouter();

  const [ingredients, setIngredients] =
    useState<Ingredient[]>(initialIngredients);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");
  const [expiry, setExpiry] = useState("");

  const expiringCount = ingredients.filter(
    (item) => getStatus(item) === "expiring",
  ).length;

  const expiredCount = ingredients.filter(
    (item) => getStatus(item) === "expired",
  ).length;

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      const matchSearch = item.name
        .toLocaleLowerCase("vi-VN")
        .includes(search.trim().toLocaleLowerCase("vi-VN"));

      const status = getStatus(item);

      const matchFilter =
        filter === "all" ||
        (filter === "expiring" && status === "expiring") ||
        (filter === "expired" && status === "expired");

      return matchSearch && matchFilter;
    });
  }, [ingredients, search, filter]);

  const resetForm = () => {
    setName("");
    setQuantity("");
    setUnit("g");
    setExpiry("");
  };

  const addIngredient = () => {
    const amount = Number(quantity.replace(",", "."));

    if (
      !name.trim() ||
      !unit.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !parseDate(expiry)
    ) {
      Alert.alert(
        "Thông tin chưa hợp lệ",
        "Nhập tên, số lượng lớn hơn 0, đơn vị và hạn sử dụng theo dạng YYYY-MM-DD.",
      );
      return;
    }

    setIngredients((current) => [
      {
        id: Date.now().toString(),
        emoji: "🥗",
        name: name.trim(),
        quantity: String(amount),
        unit: unit.trim(),
        expiry,
      },
      ...current,
    ]);

    resetForm();
    setModalVisible(false);
    setFilter("all");
    setSearch("");
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <AppHeader showNotification unreadCount={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* TIÊU ĐỀ */}
        <View style={styles.titleRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={23} color={C.orange} />
          </Pressable>

          <Text style={styles.title}>Kho thực phẩm</Text>
        </View>

        <Text style={styles.subtitle}>Theo dõi số lượng và hạn sử dụng</Text>

        {/* THỐNG KÊ */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Package size={20} color={C.orange} />
            </View>
            <Text style={styles.statNumber}>{ingredients.length}</Text>
            <Text style={styles.statLabel}>Nguyên liệu đang có</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <AlertTriangle size={20} color="#B87418" />
            </View>
            <Text style={styles.statNumber}>
              {String(expiringCount).padStart(2, "0")}
            </Text>
            <Text style={styles.statLabel}>Sắp hết hạn</Text>
          </View>
        </View>

        {/* TÌM KIẾM */}
        <View style={styles.searchBox}>
          <Search size={20} color={C.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm nguyên liệu..."
            placeholderTextColor="#A18B81"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <X size={18} color={C.muted} />
            </Pressable>
          )}
        </View>

        {/* BỘ LỌC */}
        <View style={styles.filters}>
          {(
            [
              ["all", "Tất cả"],
              ["expiring", "Sắp hết hạn"],
              ["expired", "Đã hết"],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[
                styles.filterButton,
                filter === key && styles.filterActive,
              ]}
              onPress={() => setFilter(key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === key && styles.filterTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* DANH SÁCH NGUYÊN LIỆU */}
        <View style={styles.list}>
          {filteredIngredients.length === 0 ? (
            <View style={styles.empty}>
              <Package size={32} color={C.muted} />
              <Text style={styles.emptyText}>Không tìm thấy nguyên liệu</Text>
            </View>
          ) : (
            filteredIngredients.map((item) => {
              const status = getStatus(item);

              return (
                <Pressable
                  key={item.id}
                  style={styles.ingredientCard}
                  onPress={() =>
                    router.push({
                      pathname: "/ingredient-detail",
                      params: {
                        id: item.id,
                        name: item.name,
                        emoji: item.emoji,
                        quantity: item.quantity,
                        unit: item.unit,
                        expiry: item.expiry,
                        entryDate: "2026-10-19",
                      },
                    })
                  }
                >
                  <View style={styles.emojiBox}>
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  </View>

                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{item.name}</Text>

                    <Text style={styles.ingredientDetails}>
                      {item.quantity} {item.unit}
                      {" · "}
                      {formatExpiry(item.expiry)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusDot,
                      status === "expiring"
                        ? styles.warningDot
                        : status === "expired"
                          ? styles.expiredDot
                          : styles.freshDot,
                    ]}
                  />
                </Pressable>
              );
            })
          )}
        </View>

        {/* CẢNH BÁO */}
        {(expiringCount > 0 || expiredCount > 0) && (
          <Pressable
            style={styles.warningBanner}
            onPress={() =>
              setFilter(expiringCount > 0 ? "expiring" : "expired")
            }
          >
            <AlertTriangle size={18} color="#A46A18" />
            <Text style={styles.warningText}>
              {expiringCount > 0
                ? `${expiringCount} thực phẩm sắp hết hạn · Xem ngay`
                : `${expiredCount} thực phẩm đã hết hạn · Xem ngay`}
            </Text>
          </Pressable>
        )}

        {/* THÊM NGUYÊN LIỆU */}
        <Pressable
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={20} color={C.white} />
          <Text style={styles.addText}>Thêm nguyên liệu</Text>
        </Pressable>
      </ScrollView>

      <BottomNav />

      {/* MODAL THÊM NGUYÊN LIỆU */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeading}>
              <Text style={styles.modalTitle}>Thêm nguyên liệu</Text>

              <Pressable onPress={() => setModalVisible(false)}>
                <X size={23} color={C.muted} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Tên nguyên liệu</Text>
            <TextInput
              style={styles.field}
              placeholder="Ví dụ: Thịt bò"
              value={name}
              onChangeText={setName}
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Số lượng</Text>
                <TextInput
                  style={styles.field}
                  placeholder="500"
                  keyboardType="decimal-pad"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Đơn vị</Text>
                <TextInput
                  style={styles.field}
                  placeholder="g, kg, quả..."
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Hạn sử dụng</Text>
            <View style={styles.expiryField}>
              <CalendarDays size={19} color={C.orange} />
              <TextInput
                style={{ flex: 1, color: C.dark }}
                placeholder="YYYY-MM-DD"
                value={expiry}
                onChangeText={setExpiry}
                autoCapitalize="none"
              />
            </View>

            <Pressable style={styles.saveButton} onPress={addIngredient}>
              <Check size={19} color={C.white} />
              <Text style={styles.saveText}>Lưu nguyên liệu</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.cream,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 24,
    height: 38,
    justifyContent: "center",
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: C.dark,
  },
  subtitle: {
    marginTop: 9,
    color: C.muted,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 13,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    minHeight: 112,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    padding: 15,
    justifyContent: "center",
  },
  statIcon: {
    position: "absolute",
    right: 13,
    top: 13,
  },
  statNumber: {
    fontSize: 29,
    fontWeight: "800",
    color: C.orange,
  },
  statLabel: {
    marginTop: 11,
    fontSize: 11,
    color: C.muted,
  },
  searchBox: {
    height: 49,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginTop: 23,
  },
  searchInput: {
    flex: 1,
    color: C.dark,
    fontSize: 13,
  },
  filters: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    backgroundColor: C.white,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.muted,
  },
  filterTextActive: {
    color: C.white,
    fontWeight: "800",
  },
  list: {
    gap: 11,
    marginTop: 20,
  },
  ingredientCard: {
    minHeight: 82,
    backgroundColor: C.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 27,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "800",
    color: C.dark,
  },
  ingredientDetails: {
    marginTop: 8,
    fontSize: 11,
    color: C.muted,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  freshDot: {
    backgroundColor: C.green,
  },
  warningDot: {
    backgroundColor: "#E8A22D",
  },
  expiredDot: {
    backgroundColor: "#D44A40",
  },
  empty: {
    paddingVertical: 35,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
  },
  warningBanner: {
    marginTop: 17,
    borderRadius: 12,
    padding: 13,
    backgroundColor: "#FFF0DA",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#9D681D",
    fontWeight: "700",
  },
  addButton: {
    height: 52,
    backgroundColor: C.orange,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 20,
  },
  addText: {
    color: C.white,
    fontWeight: "800",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 35,
  },
  modalHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: C.dark,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.dark,
    marginTop: 14,
    marginBottom: 8,
  },
  field: {
    height: 46,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: C.dark,
    backgroundColor: C.cream,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  expiryField: {
    height: 46,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: C.cream,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  saveButton: {
    height: 51,
    borderRadius: 12,
    backgroundColor: C.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 25,
  },
  saveText: {
    color: C.white,
    fontWeight: "800",
    fontSize: 14,
  },
});
