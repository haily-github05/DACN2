import React, { useEffect, useMemo, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  Plus,
  Search,
  ShoppingCart,
  Check,
  Trash2,
  X,
  PackageCheck,
  ChevronRight,
  Sparkles,
  Leaf,
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
  green: "#397C57",
  greenLight: "#E9F5EB",
};

const STORAGE_KEY = "smart-kitchen-shopping-list-v1";

type Category =
  | "Rau củ & Gia vị"
  | "Thịt & Hải sản"
  | "Sữa & Chế phẩm"
  | "Khác";

type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  category: Category;
  reason: string;
  checked: boolean;
};

type Filter = "all" | "pending" | "done";

const CATEGORIES: Category[] = [
  "Rau củ & Gia vị",
  "Thịt & Hải sản",
  "Sữa & Chế phẩm",
  "Khác",
];

const EMOJI: Record<Category, string> = {
  "Rau củ & Gia vị": "🥬",
  "Thịt & Hải sản": "🥩",
  "Sữa & Chế phẩm": "🥛",
  Khác: "🛍️",
};

const INITIAL_ITEMS: ShoppingItem[] = [
  {
    id: "1",
    name: "Súp lơ baby",
    quantity: "300g",
    category: "Rau củ & Gia vị",
    reason: "Cho món bò cuộn súp lơ",
    checked: false,
  },
  {
    id: "2",
    name: "Tỏi",
    quantity: "2 củ",
    category: "Rau củ & Gia vị",
    reason: "Gia vị chế biến",
    checked: false,
  },
  {
    id: "3",
    name: "Cà rốt",
    quantity: "500g",
    category: "Rau củ & Gia vị",
    reason: "Bổ sung rau củ",
    checked: true,
  },
  {
    id: "4",
    name: "Phô mai Mozzarella",
    quantity: "200g",
    category: "Sữa & Chế phẩm",
    reason: "Cho món đút lò",
    checked: false,
  },
  {
    id: "5",
    name: "Sữa tươi",
    quantity: "1 lít",
    category: "Sữa & Chế phẩm",
    reason: "Dùng cho bữa sáng",
    checked: true,
  },
  {
    id: "6",
    name: "Kem tươi",
    quantity: "200ml",
    category: "Sữa & Chế phẩm",
    reason: "Cho món súp bí đỏ",
    checked: false,
  },
];

export default function ShoppingListScreen() {
  const router = useRouter();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("Rau củ & Gia vị");

  useEffect(() => {
    async function loadItems() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);

        if (saved !== null) {
          const parsed = JSON.parse(saved);
          setItems(Array.isArray(parsed) ? parsed : INITIAL_ITEMS);
        } else {
          setItems(INITIAL_ITEMS);
        }
      } catch {
        setItems(INITIAL_ITEMS);
      } finally {
        setLoaded(true);
      }
    }

    loadItems();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {
      console.warn("Không thể lưu danh sách mua sắm");
    });
  }, [items, loaded]);

  const total = items.length;
  const completed = items.filter((i) => i.checked).length;
  const pending = total - completed;

  const progress = total > 0 ? (completed / total) * 100 : 0;

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(keyword) ||
        item.reason.toLowerCase().includes(keyword);

      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && !item.checked) ||
        (filter === "done" && item.checked);

      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home" as any);
    }
  };

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const removeItem = (item: ShoppingItem) => {
    Alert.alert(
      "Xóa nguyên liệu",
      `Bạn muốn xóa "${item.name}" khỏi danh sách?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          },
        },
      ],
    );
  };

  const addItem = () => {
    const name = newName.trim();
    const quantity = newQuantity.trim();

    if (!name || !quantity) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập tên và số lượng nguyên liệu.",
      );
      return;
    }

    const newItem: ShoppingItem = {
      id: `${Date.now()}-${Math.random()}`,
      name,
      quantity,
      category: newCategory,
      reason: "Thêm thủ công",
      checked: false,
    };

    setItems((prev) => [...prev, newItem]);

    setNewName("");
    setNewQuantity("");
    setNewCategory("Rau củ & Gia vị");
    setModalVisible(false);
  };

  const transferToPantry = () => {
    const purchased = items.filter((i) => i.checked);

    if (purchased.length === 0) {
      Alert.alert(
        "Chưa có nguyên liệu",
        "Hãy đánh dấu nguyên liệu đã mua trước.",
      );
      return;
    }

    Alert.alert(
      "Nguyên liệu đã mua",
      `Bạn đã mua ${purchased.length} nguyên liệu.\n\n` +
        "Chức năng tự động chuyển dữ liệu vào kho chưa được kết nối. Bạn có thể mở Kho thực phẩm để thêm nguyên liệu.",
      [
        { text: "Đóng", style: "cancel" },
        {
          text: "Mở Kho thực phẩm",
          onPress: () => router.push("/pantry" as any),
        },
      ],
    );
  };

  const renderItem = (item: ShoppingItem) => (
    <View key={item.id} style={styles.itemCard}>
      <Pressable
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
        onPress={() => toggleItem(item.id)}
      >
        {item.checked && <Check size={16} color={C.white} />}
      </Pressable>

      <View style={styles.itemEmojiBox}>
        <Text style={styles.itemEmoji}>{EMOJI[item.category]}</Text>
      </View>

      <Pressable style={styles.itemInfo} onPress={() => toggleItem(item.id)}>
        <Text
          style={[styles.itemName, item.checked && styles.completedText]}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        <Text style={styles.itemReason} numberOfLines={2}>
          {item.reason}
        </Text>

        {item.checked && <Text style={styles.purchasedLabel}>✓ Đã mua</Text>}
      </Pressable>

      <View style={styles.itemRight}>
        <Text style={styles.itemQuantity}>{item.quantity}</Text>

        <Pressable style={styles.deleteButton} onPress={() => removeItem(item)}>
          <Trash2 size={15} color={C.muted} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      {/* HEADER CHUNG */}
      <AppHeader />

      {/* NÚT QUAY LẠI */}
      <View style={styles.pageHeader}>
        <Pressable style={styles.backButton} onPress={goBack}>
          <ArrowLeft size={21} color={C.orange} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Danh sách mua sắm</Text>
          <Text style={styles.headerSubtitle}>
            Mua đủ nguyên liệu, nấu ngon mỗi ngày
          </Text>
        </View>

        <ShoppingCart size={22} color={C.orange} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>KẾ HOẠCH ĐI CHỢ</Text>

        <Text style={styles.pageTitle}>Mua sắm thông minh</Text>

        <View style={styles.introRow}>
          <Text style={styles.introSubtitle}>Theo dõi những món cần mua</Text>

          <Pressable
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={15} color={C.white} />
            <Text style={styles.addButtonText}>Thêm nguyên liệu</Text>
          </Pressable>
        </View>

        {/* TIẾN ĐỘ */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.inline}>
              <ShoppingCart size={19} color={C.orange} />
              <Text style={styles.progressTitle}>Tiến độ mua sắm</Text>
            </View>

            <Text style={styles.progressCount}>
              {completed}/{total} món
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <Text style={styles.progressDescription}>
            Đã mua {completed} món · Còn {pending} món cần mua
          </Text>

          <View style={styles.progressTip}>
            <Sparkles size={14} color={C.green} />
            <Text style={styles.progressTipText}>
              {pending === 0
                ? "Tuyệt vời! Bạn đã hoàn thành danh sách."
                : "Chuẩn bị đủ nguyên liệu để nấu món ngon!"}
            </Text>
          </View>
        </View>

        {/* TÌM KIẾM */}
        <View style={styles.searchBox}>
          <Search size={18} color={C.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm nguyên liệu trong danh sách..."
            placeholderTextColor="#A18B81"
            value={search}
            onChangeText={setSearch}
          />

          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <X size={17} color={C.muted} />
            </Pressable>
          )}
        </View>

        {/* BỘ LỌC */}
        <View style={styles.filterRow}>
          {[
            { key: "all", label: `Tất cả (${total})` },
            {
              key: "pending",
              label: `Chưa mua (${pending})`,
            },
            {
              key: "done",
              label: `Đã mua (${completed})`,
            },
          ].map((option) => {
            const active = filter === option.key;

            return (
              <Pressable
                key={option.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(option.key as Filter)}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* DANH SÁCH THEO NHÓM */}
        {CATEGORIES.map((category) => {
          const categoryItems = filteredItems.filter(
            (item) => item.category === category,
          );

          if (categoryItems.length === 0) return null;

          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>
                  {EMOJI[category]} {category}
                </Text>

                <Text style={styles.categoryCount}>
                  {categoryItems.length} nguyên liệu
                </Text>
              </View>

              {categoryItems.map(renderItem)}
            </View>
          );
        })}

        {filteredItems.length === 0 && (
          <View style={styles.emptyCard}>
            <ShoppingCart size={34} color={C.orange} />

            <Text style={styles.emptyTitle}>Không có nguyên liệu</Text>

            <Text style={styles.emptyDescription}>
              Hãy thêm nguyên liệu hoặc thay đổi bộ lọc.
            </Text>

            <Pressable
              style={styles.emptyAddButton}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={16} color={C.white} />
              <Text style={styles.emptyAddText}>Thêm nguyên liệu</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.aiTipCard}>
          <Leaf size={19} color={C.green} />
          <Text style={styles.aiTipText}>
            Mẹo Smart Kitchen AI: Kiểm tra thực phẩm trong kho trước khi đi chợ
            để tránh mua trùng và giảm lãng phí.
          </Text>
        </View>
      </ScrollView>

      {/* NÚT CHUYỂN VÀO KHO */}
      <View style={styles.bottomAction}>
        <Pressable style={styles.transferButton} onPress={transferToPantry}>
          <PackageCheck size={18} color={C.white} />
          <Text style={styles.transferText}>
            Chuyển nguyên liệu đã mua vào kho
          </Text>
          <ChevronRight size={17} color={C.white} />
        </Pressable>
      </View>

      {/* BOTTOM NAV CHUNG */}
      <BottomNav />

      {/* MODAL THÊM NGUYÊN LIỆU */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm nguyên liệu cần mua</Text>

              <Pressable onPress={() => setModalVisible(false)}>
                <X size={22} color={C.muted} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Tên nguyên liệu</Text>

            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Cà chua"
              placeholderTextColor="#A18B81"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.inputLabel}>Số lượng</Text>

            <TextInput
              style={styles.input}
              placeholder="Ví dụ: 500g, 2 quả..."
              placeholderTextColor="#A18B81"
              value={newQuantity}
              onChangeText={setNewQuantity}
            />

            <Text style={styles.inputLabel}>Nhóm thực phẩm</Text>

            <View style={styles.categoryChoices}>
              {CATEGORIES.map((category) => {
                const active = newCategory === category;

                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryChoice,
                      active && styles.categoryChoiceActive,
                    ]}
                    onPress={() => setNewCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryChoiceText,
                        active && { color: C.white },
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.saveButton} onPress={addItem}>
              <Plus size={18} color={C.white} />
              <Text style={styles.saveButtonText}>Thêm vào danh sách</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },
  pageHeader: {
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
  },
  headerSubtitle: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: C.orange,
  },
  pageTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: C.dark,
    marginTop: 7,
  },
  introRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
    marginBottom: 17,
    gap: 7,
  },
  introSubtitle: {
    fontSize: 11,
    color: C.muted,
    flex: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.orange,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  addButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.white,
  },
  progressCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 15,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.dark,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: "800",
    color: C.orange,
  },
  progressTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: C.peach,
    marginTop: 18,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.orange,
    borderRadius: 5,
  },
  progressDescription: {
    fontSize: 11,
    color: C.muted,
    marginTop: 11,
  },
  progressTip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 13,
  },
  progressTipText: {
    flex: 1,
    fontSize: 10,
    color: C.green,
    fontWeight: "700",
  },
  searchBox: {
    height: 45,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: C.dark,
  },
  filterRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 13,
    marginBottom: 22,
  },
  filterChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },
  filterText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
  },
  filterTextActive: {
    color: C.white,
  },
  categorySection: {
    marginBottom: 17,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
    gap: 7,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
  },
  categoryCount: {
    fontSize: 10,
    color: C.muted,
  },
  itemCard: {
    backgroundColor: C.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 9,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  itemEmojiBox: {
    width: 44,
    height: 44,
    backgroundColor: C.peach,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemEmoji: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "800",
    color: C.dark,
  },
  completedText: {
    color: C.muted,
    textDecorationLine: "line-through",
  },
  itemReason: {
    fontSize: 10,
    color: C.muted,
    marginTop: 5,
    lineHeight: 14,
  },
  purchasedLabel: {
    fontSize: 9,
    color: C.green,
    fontWeight: "800",
    marginTop: 5,
  },
  itemRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  itemQuantity: {
    fontSize: 11,
    fontWeight: "800",
    color: C.orange,
  },
  deleteButton: {
    padding: 4,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 15,
    padding: 27,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.dark,
  },
  emptyDescription: {
    fontSize: 11,
    color: C.muted,
    textAlign: "center",
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.orange,
    borderRadius: 10,
    padding: 11,
    marginTop: 5,
  },
  emptyAddText: {
    fontSize: 11,
    color: C.white,
    fontWeight: "800",
  },
  aiTipCard: {
    backgroundColor: C.greenLight,
    borderRadius: 13,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 9,
  },
  aiTipText: {
    flex: 1,
    color: C.green,
    fontSize: 11,
    lineHeight: 17,
  },
  bottomAction: {
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  transferButton: {
    minHeight: 43,
    backgroundColor: C.orange,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 8,
  },
  transferText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
    color: C.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(32,26,23,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 35,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 8,
  },
  input: {
    height: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cream,
    paddingHorizontal: 12,
    fontSize: 13,
    color: C.dark,
    marginBottom: 16,
  },
  categoryChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 18,
  },
  categoryChoice: {
    backgroundColor: C.peach,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  categoryChoiceActive: {
    backgroundColor: C.orange,
  },
  categoryChoiceText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.orange,
  },
  saveButton: {
    height: 47,
    backgroundColor: C.orange,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
  },
});
