import RequireLogin from "../components/RequireLogin";
// Trang: Danh sách mua sắm — thêm, đánh dấu đã mua và chuyển vào kho.
import { matchesSearch } from "../lib/search";
import SearchField from "../components/SearchField";
import React, { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";
import { kitchenRequest } from "../lib/kitchenApi";
import {
  ArrowLeft,
  Plus,
  ShoppingCart,
  Check,
  Trash2,
  X,
  PackageCheck,
  ChevronRight,
  Leaf,
  BadgeCheck,
  CircleCheck,
  CalendarDays,
  Clock3,
} from "lucide-react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import FoodImage from "../components/FoodImage";

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
  image?: string;
};

type Filter = "all" | "pending" | "done";

const CATEGORIES: Category[] = [
  "Rau củ & Gia vị",
  "Thịt & Hải sản",
  "Sữa & Chế phẩm",
  "Khác",
];

function normalizeShoppingCategory(value: unknown): Category {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/rau|vegetable|herb|spice|gia vi|trai cay|fruit/.test(normalized)) return "Rau củ & Gia vị";
  if (/thit|meat|poultry|hai san|seafood|fish/.test(normalized)) return "Thịt & Hải sản";
  if (/sua|dairy|milk|cheese/.test(normalized)) return "Sữa & Chế phẩm";
  return "Khác";
}

function parseMealPlanContexts(reason: string) {
  const prefix = "Thiếu cho thực đơn đã lưu: ";
  if (!reason.startsWith(prefix)) return [];
  return reason.slice(prefix.length).split("; ").map((entry) => {
    const [recipe, date, meal] = entry.split(" · ");
    return { recipe, date, meal };
  }).filter((context) => Boolean(context.recipe && context.date && context.meal));
}

const EMOJI: Record<Category, string> = {
  "Rau củ & Gia vị": "🥬",
  "Thịt & Hải sản": "🥩",
  "Sữa & Chế phẩm": "🥛",
  Khác: "🛍️",
};

function ShoppingListScreen() {
  const router = useRouter();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");

  const [modalVisible, setModalVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<ShoppingItem | null>(null);
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("Rau củ & Gia vị");

  useFocusEffect(useCallback(() => {
    let active = true;
    kitchenRequest<ShoppingItem[]>("shopping").then(data => {
      if (active) {
        setItems(data.map(item => ({ ...item, category: normalizeShoppingCategory(item.category) })));
        setLoaded(true);
      }
    }).catch(error => Alert.alert("Không thể tải danh sách", error.message));
    return () => { active = false; };
  }, []));
  const [saving, setSaving] = useState(false);
  const mutate = async (task: () => Promise<void>) => {
    if (!loaded || saving) return;
    setSaving(true);
    try { await task(); } catch (error) {
      Alert.alert("Không thể lưu", error instanceof Error ? error.message : "Vui lòng thử lại");
    } finally { setSaving(false); }
  };

  const total = items.length;
  const completed = items.filter((i) => i.checked).length;
  const pending = total - completed;

  const progress = total > 0 ? (completed / total) * 100 : 0;
  const detailContexts = detailItem ? parseMealPlanContexts(detailItem.reason) : [];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery = matchesSearch(search, item.name, item.category, item.reason);
      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && !item.checked) ||
        (filter === "done" && item.checked);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesQuery && matchesFilter && matchesCategory;
    });
  }, [items, search, filter, categoryFilter]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home" as any);
    }
  };

  const toggleItem = (id: string) => void mutate(async () => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    await kitchenRequest(`shopping/${id}`, "PATCH", { checked: !item.checked });
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  });

  const removePurchased = () => {
    const purchased = items.filter((item) => item.checked);
    if (!purchased.length) return;
    Alert.alert("Xóa món đã mua", `Xóa ${purchased.length} nguyên liệu đã mua khỏi danh sách?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => void mutate(async () => {
        await Promise.all(purchased.map((item) => kitchenRequest(`shopping/${item.id}`, "DELETE")));
        setItems((current) => current.filter((item) => !item.checked));
      }) },
    ]);
  };

  const completeList = () => {
    const pendingItems = items.filter((item) => !item.checked);
    if (!pendingItems.length) return;
    Alert.alert("Hoàn tất danh sách", `Đánh dấu đã mua tất cả ${pendingItems.length} nguyên liệu còn lại?`, [
      { text: "Để sau", style: "cancel" },
      { text: "Hoàn tất", onPress: () => void mutate(async () => {
        await Promise.all(pendingItems.map((item) => kitchenRequest(`shopping/${item.id}`, "PATCH", { checked: true })));
        setItems((current) => current.map((item) => ({ ...item, checked: true })));
      }) },
    ]);
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
            void mutate(async () => {
              await kitchenRequest(`shopping/${item.id}`, "DELETE");
              setItems(prev => prev.filter(i => i.id !== item.id));
            });
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

    void mutate(async () => {
      const saved = await kitchenRequest<ShoppingItem>("shopping", "POST", newItem);
      setItems(prev => [...prev, saved]);
      setNewName(""); setNewQuantity(""); setNewCategory("Rau củ & Gia vị");
      setModalVisible(false);
    });
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

    Alert.alert("Chuyển vào kho", "Nguyên liệu sẽ được chuyển vào ngăn mát. Hãy cập nhật hạn sử dụng tại kho.", [
      { text: "Hủy", style: "cancel" },
      { text: "Chuyển", onPress: () => void mutate(async () => {
        await kitchenRequest("shopping/transfer", "POST");
        setItems(prev => prev.filter(i => !i.checked));
        router.push("/pantry" as any);
      }) },
    ]);
  };

  const renderItem = (item: ShoppingItem) => (
    <View key={item.id} style={styles.itemCard}>
      <Pressable
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
        onPress={() => toggleItem(item.id)}
      >
        {item.checked && <Check size={16} color={C.white} />}
      </Pressable>

      {item.image ? (
        <FoodImage uri={item.image} resizeMode="cover" style={styles.itemImage} accessibilityLabel={`Ảnh ${item.name}`} />
      ) : (
        <View style={styles.itemEmojiBox}>
          <Text style={styles.itemEmoji}>{EMOJI[item.category] || "🛍️"}</Text>
        </View>
      )}

      <Pressable style={styles.itemInfo} onPress={() => setDetailItem(item)} accessibilityRole="button" accessibilityLabel={`Xem chi tiết ${item.name}`}>
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
              <BadgeCheck size={20} color={C.green} fill={C.greenLight} />
              <Text style={styles.progressTitle}>Tiến độ mua sắm</Text>
            </View>

            <Text style={styles.progressPercent}>{progress.toFixed(1)}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <Text style={styles.progressDescription}>
            Đã hoàn thành <Text style={styles.progressEmphasis}>{completed}/{total} món</Text> ({progress.toFixed(1)}%)
          </Text>

          <View style={styles.progressDivider} />

          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Tổng số</Text>
              <Text style={styles.progressStatValue}>{total}</Text>
            </View>
            <View style={[styles.progressStat, styles.progressStatDone]}>
              <Text style={[styles.progressStatLabel, { color: C.green }]}>Đã mua</Text>
              <Text style={[styles.progressStatValue, { color: C.green }]}>{completed}</Text>
            </View>
            <View style={[styles.progressStat, styles.progressStatPending]}>
              <Text style={[styles.progressStatLabel, { color: C.orange }]}>Chưa mua</Text>
              <Text style={[styles.progressStatValue, { color: C.orange }]}>{pending}</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Tiến độ</Text>
              <Text style={[styles.progressStatValue, { color: C.green }]}>{Math.round(progress)}%</Text>
            </View>
          </View>

          <View style={styles.progressActions}>
            <Pressable disabled={!completed || saving} onPress={removePurchased} style={[styles.progressAction, styles.removePurchasedButton, (!completed || saving) && styles.progressActionDisabled]}>
              <Trash2 size={14} color={C.muted} /><Text style={styles.removePurchasedText}>Xóa món đã mua</Text>
            </Pressable>
            <Pressable disabled={!pending || saving} onPress={completeList} style={[styles.progressAction, styles.completeListButton, (!pending || saving) && styles.progressActionDisabled]}>
              <CircleCheck size={15} color={C.green} /><Text style={styles.completeListText}>Hoàn tất danh sách</Text>
            </Pressable>
          </View>
        </View>

        {/* TÌM KIẾM */}
        <SearchField value={search} onChangeText={setSearch} placeholder="Tìm nguyên liệu trong danh sách..." style={styles.searchBox} inputStyle={styles.searchInput} />

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterRow}>
          {[{ key: "all" as const, label: "Mọi danh mục", count: items.length }, ...CATEGORIES.map((category) => ({ key: category, label: category, count: items.filter((item) => item.category === category).length }))].map((option) => {
            const active = categoryFilter === option.key;
            return <Pressable key={option.key} onPress={() => setCategoryFilter(option.key)} style={[styles.categoryFilterChip, active && styles.categoryFilterChipActive]}>
              <Text numberOfLines={1} style={[styles.categoryFilterText, active && styles.categoryFilterTextActive]}>{option.label} ({option.count})</Text>
            </Pressable>;
          })}
        </ScrollView>

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

      <Modal
        visible={detailItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailItem(null)}
      >
        {detailItem && <View style={styles.modalOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết nguyên liệu</Text>
              <Pressable accessibilityLabel="Đóng chi tiết" onPress={() => setDetailItem(null)}><X size={21} color={C.muted} /></Pressable>
            </View>
            <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.detailItemHeader}>
                {detailItem.image ? <FoodImage uri={detailItem.image} resizeMode="cover" style={styles.detailImage} accessibilityLabel={`Ảnh ${detailItem.name}`} /> : <View style={[styles.detailImage, styles.itemEmojiBox]}><Text style={styles.detailEmoji}>{EMOJI[detailItem.category]}</Text></View>}
                <View style={styles.detailTitleWrap}>
                  <Text style={styles.detailName}>{detailItem.name}</Text>
                  <Text style={styles.detailCategory}>{detailItem.category}</Text>
                  <View style={styles.detailQuantityPill}><Text style={styles.detailQuantity}>{detailItem.quantity}</Text></View>
                </View>
              </View>
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeading}>
                  <View style={styles.detailSectionIcon}><CalendarDays size={16} color={C.orange} /></View>
                  <Text style={styles.detailLabel}>{detailContexts.length ? "Dùng trong thực đơn" : "Thông tin"}</Text>
                  {detailContexts.length > 0 && <Text style={styles.detailCount}>{detailContexts.length} bữa</Text>}
                </View>
                {detailContexts.length ? detailContexts.map((context, index) => (
                  <View key={`${context.date}-${context.meal}-${context.recipe}-${index}`} style={styles.detailContextCard}>
                    <Text style={styles.detailRecipeName}>{context.recipe}</Text>
                    <View style={styles.detailContextMeta}>
                      <View style={styles.detailMetaPill}><CalendarDays size={12} color={C.muted} /><Text style={styles.detailMetaText}>{context.date}</Text></View>
                      <View style={[styles.detailMetaPill, styles.detailMealPill]}><Clock3 size={12} color={C.green} /><Text style={[styles.detailMetaText, { color: C.green }]}>{context.meal}</Text></View>
                    </View>
                  </View>
                )) : <Text style={styles.detailReason}>{detailItem.reason || "Nguyên liệu được thêm thủ công vào danh sách."}</Text>}
              </View>
              <View style={styles.detailStatusCard}>
                <View style={[styles.detailStatusDot, { backgroundColor: detailItem.checked ? C.green : C.orange }]} />
                <Text style={[styles.detailStatusText, { color: detailItem.checked ? C.green : C.orange }]}>{detailItem.checked ? "Đã mua" : "Chưa mua"}</Text>
              </View>
            </ScrollView>
            <Pressable disabled={saving} onPress={() => { toggleItem(detailItem.id); setDetailItem(null); }} style={[styles.detailToggleButton, detailItem.checked && styles.detailToggleButtonUndo]}>
              {detailItem.checked ? <X size={16} color={C.orange} /> : <Check size={16} color={C.white} />}
              <Text style={[styles.detailToggleText, detailItem.checked && { color: C.orange }]}>{detailItem.checked ? "Đánh dấu chưa mua" : "Đánh dấu đã mua"}</Text>
            </Pressable>
          </View>
        </View>}
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
  progressPercent: {
    fontSize: 13,
    fontWeight: "800",
    color: C.green,
  },
  progressTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: "#E1E7EE",
    marginTop: 18,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.green,
    borderRadius: 5,
  },
  progressDescription: {
    fontSize: 11,
    color: C.muted,
    marginTop: 11,
  },
  progressEmphasis: {
    color: C.orange,
    fontWeight: "800",
  },
  progressDivider: {
    height: 1,
    backgroundColor: C.border,
    marginTop: 13,
  },
  progressStats: {
    flexDirection: "row",
    gap: 7,
    marginTop: 13,
  },
  progressStat: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#F4DDD6",
    borderRadius: 12,
    backgroundColor: "#FFF9F7",
  },
  progressStatDone: {
    borderColor: "#D2E8D9",
    backgroundColor: "#F0F7F2",
  },
  progressStatPending: {
    borderColor: "#FFD2C3",
    backgroundColor: "#FFF4EF",
  },
  progressStatLabel: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  progressStatValue: {
    color: C.orange,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 3,
  },
  progressActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },
  progressAction: {
    flex: 1,
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  removePurchasedButton: {
    backgroundColor: "#FFF9F7",
    borderWidth: 1,
    borderColor: "#F4DDD6",
  },
  completeListButton: {
    backgroundColor: C.greenLight,
  },
  progressActionDisabled: {
    opacity: 0.48,
  },
  removePurchasedText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "700",
  },
  completeListText: {
    color: C.green,
    fontSize: 9,
    fontWeight: "700",
  },
  categoryFilterRow: {
    gap: 7,
    paddingBottom: 3,
    marginBottom: 17,
  },
  categoryFilterChip: {
    maxWidth: 190,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  categoryFilterChipActive: {
    borderColor: C.green,
    backgroundColor: C.greenLight,
  },
  categoryFilterText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "700",
  },
  categoryFilterTextActive: {
    color: C.green,
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
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: C.peach,
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
  detailCard: {
    maxHeight: "86%",
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  detailScroll: {
    flexShrink: 1,
  },
  detailScrollContent: {
    paddingBottom: 12,
  },
  detailItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    padding: 11,
    borderRadius: 15,
    backgroundColor: C.cream,
  },
  detailImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: C.peach,
  },
  detailEmoji: {
    fontSize: 32,
  },
  detailTitleWrap: {
    flex: 1,
    gap: 4,
  },
  detailName: {
    color: C.dark,
    fontSize: 16,
    fontWeight: "800",
  },
  detailCategory: {
    color: C.muted,
    fontSize: 10,
  },
  detailQuantityPill: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: C.peach,
  },
  detailQuantity: {
    color: C.orange,
    fontSize: 11,
    fontWeight: "800",
  },
  detailSection: {
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.white,
  },
  detailSectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 9,
  },
  detailSectionIcon: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: C.peach,
  },
  detailLabel: {
    color: C.dark,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  detailCount: {
    color: C.muted,
    fontSize: 9,
  },
  detailContextCard: {
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#F3E9E3",
  },
  detailRecipeName: {
    color: C.dark,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  detailContextMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  detailMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.cream,
  },
  detailMealPill: {
    backgroundColor: C.greenLight,
  },
  detailMetaText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "600",
  },
  detailReason: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  detailStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    marginTop: 11,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: C.cream,
  },
  detailStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  detailToggleButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 9,
    borderRadius: 12,
    backgroundColor: C.green,
  },
  detailToggleButtonUndo: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cream,
  },
  detailToggleText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "800",
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

// Người dùng khách cần đăng nhập trước khi truy cập chức năng cá nhân.
export default function ProtectedPage() { return <RequireLogin><ShoppingListScreen/></RequireLogin>; }
