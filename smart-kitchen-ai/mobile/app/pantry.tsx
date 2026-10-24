import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Constants from "expo-constants";
import { getCurrentUserId } from "../lib/auth";
import {
  ArrowLeft,
  Plus,
  Search,
  SlidersHorizontal,
  ScanLine,
  Refrigerator,
  Snowflake,
  Package,
  Leaf,
  Sparkles,
  ChevronRight,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  ShoppingBasket,
  MoreVertical,
  LayoutGrid,
} from "lucide-react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

const C = {
  orange: "#A23A00",
  orangeLight: "#D86A2E",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  green: "#397C57",
  greenLight: "#E9F5EB",
  red: "#C83D2B",
  redLight: "#FFF0EC",
  yellow: "#FFF4D8",
};

type Location = "Ngăn mát" | "Ngăn đông" | "Đồ khô";

type Ingredient = {
  id: number;
  name: string;
  description: string;
  quantity: string;
  location: Location;
  daysLeft: number;
  emoji: string;
  category: string;
};

const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: 1,
    name: "Thịt bò Fuji phi lê",
    description: "Đóng gói hút chân không",
    quantity: "400g",
    location: "Ngăn mát",
    daysLeft: 1,
    emoji: "🥩",
    category: "Thịt",
  },
  {
    id: 2,
    name: "Súp lơ baby hữu cơ",
    description: "Rau củ tươi Đà Lạt",
    quantity: "300g",
    location: "Ngăn mát",
    daysLeft: 2,
    emoji: "🥦",
    category: "Rau củ",
  },
  {
    id: 3,
    name: "Sữa chua men sống Probi",
    description: "Lốc 4 hộp",
    quantity: "260ml",
    location: "Ngăn mát",
    daysLeft: 14,
    emoji: "🥛",
    category: "Sữa",
  },
  {
    id: 4,
    name: "Trứng gà ta",
    description: "Trứng gà tươi",
    quantity: "8 quả",
    location: "Ngăn mát",
    daysLeft: 9,
    emoji: "🥚",
    category: "Trứng",
  },
  {
    id: 5,
    name: "Phô mai Mozzarella",
    description: "Phô mai bào sợi",
    quantity: "250g",
    location: "Ngăn mát",
    daysLeft: 3,
    emoji: "🧀",
    category: "Sữa",
  },
  {
    id: 6,
    name: "Cá hồi đông lạnh",
    description: "Cá hồi phi lê",
    quantity: "500g",
    location: "Ngăn đông",
    daysLeft: 20,
    emoji: "🐟",
    category: "Hải sản",
  },
  {
    id: 7,
    name: "Gạo ST25",
    description: "Gạo thơm đặc sản",
    quantity: "2kg",
    location: "Đồ khô",
    daysLeft: 90,
    emoji: "🍚",
    category: "Ngũ cốc",
  },
  {
    id: 8,
    name: "Cà rốt Đà Lạt",
    description: "Rau củ tươi",
    quantity: "500g",
    location: "Ngăn mát",
    daysLeft: 0,
    emoji: "🥕",
    category: "Rau củ",
  },
];

type StatusFilter = "all" | "expiring" | "expired";

const LOCATIONS: {
  key: Location;
  icon: React.ComponentType<any>;
}[] = [
  { key: "Ngăn mát", icon: Refrigerator },
  { key: "Ngăn đông", icon: Snowflake },
  { key: "Đồ khô", icon: Package },
];
const API_URL = (
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  `http://${Constants.expoConfig?.hostUri?.split(":")[0]}:3000`
).replace(/\/+$/, "");

const getEmoji = (category: string) => {
  const icons: Record<string, string> = {
    Thịt: "🥩",
    Trứng: "🥚",
    "Rau củ": "🥦",
    "Hải sản": "🐟",
    Sữa: "🥛",
    "Ngũ cốc": "🍚",
    Nấm: "🍄",
    Đậu: "🫘",
    "Trái cây": "🍎",
    "Gia vị": "🧄",
  };

  return icons[category] || "🥗";
};

const loadPantryFromMySQL = async (): Promise<Ingredient[]> => {
  const userId = await getCurrentUserId();

  const response = await fetch(`${API_URL}/api/pantry/${userId}`);
  const result = await response.json();

  if (!response.ok || result.success !== true) {
    throw new Error(result.message || "Không thể tải kho thực phẩm");
  }

  return result.data.map((item: any) => ({
    id: Number(item.id),
    name: item.name,
    description: item.category || "Nguyên liệu trong kho",
    quantity: `${Number(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`,
    location: item.location === "Nhiệt độ phòng" ? "Đồ khô" : item.location,
    daysLeft: item.daysLeft === null ? 9999 : Number(item.daysLeft),
    emoji: getEmoji(item.category),
    category: item.category || "Khác",
  }));
};
export default function PantryScreen() {
  const router = useRouter();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadData = async () => {
        try {
          setLoading(true);

          const data = await loadPantryFromMySQL();

          if (active) {
            setIngredients(data);
          }
        } catch (error) {
          console.error("Lỗi tải kho:", error);

          if (active) {
            setIngredients([]);
            Alert.alert(
              "Lỗi",
              error instanceof Error
                ? error.message
                : "Không thể tải dữ liệu kho",
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      loadData();

      return () => {
        active = false;
      };
    }, []),
  );

  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] =
    useState<Location>("Ngăn mát");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const total = ingredients.length;

  const freshCount = ingredients.filter((item) => item.daysLeft > 3).length;

  const expiringCount = ingredients.filter(
    (item) => item.daysLeft > 0 && item.daysLeft <= 3,
  ).length;

  const expiredCount = ingredients.filter((item) => item.daysLeft <= 0).length;

  const locationCounts = useMemo(() => {
    return {
      "Ngăn mát": ingredients.filter((i) => i.location === "Ngăn mát").length,
      "Ngăn đông": ingredients.filter((i) => i.location === "Ngăn đông").length,
      "Đồ khô": ingredients.filter((i) => i.location === "Đồ khô").length,
    };
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());

      const matchesLocation = item.location === selectedLocation;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "expiring" &&
          item.daysLeft > 0 &&
          item.daysLeft <= 3) ||
        (statusFilter === "expired" && item.daysLeft <= 0);

      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [ingredients, search, selectedLocation, statusFilter]);

  const goTo = (path: string, params?: Record<string, string>) => {
    if (params) {
      router.push({
        pathname: path as any,
        params,
      });
    } else {
      router.push(path as any);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home" as any);
    }
  };

  const showIngredientDetail = (item: Ingredient) => {
    router.push({
      pathname: "/ingredient-detail" as any,
      params: {
        id: String(item.id),
        name: item.name,
      },
    });
  };

  const handleIngredientAction = (item: Ingredient) => {
    if (item.daysLeft <= 0) {
      Alert.alert(
        "Thực phẩm đã hết hạn",
        "Hãy kiểm tra tình trạng thực phẩm và loại bỏ nếu không còn an toàn.",
      );
      return;
    }

    goTo("/recipes", { search: item.name });
  };

  const handleMenu = (item: Ingredient) => {
    Alert.alert(item.name, "Bạn muốn thực hiện thao tác nào?", [
      {
        text: "Xem chi tiết",
        onPress: () => showIngredientDetail(item),
      },
      {
        text: "Xóa nguyên liệu",
        style: "destructive",
        onPress: () =>
          Alert.alert("Xác nhận xóa", `Bạn muốn xóa "${item.name}" khỏi kho?`, [
            { text: "Hủy", style: "cancel" },
            {
              text: "Xóa",
              style: "destructive",
              onPress: () =>
                setIngredients((prev) => prev.filter((i) => i.id !== item.id)),
            },
          ]),
      },
      { text: "Hủy", style: "cancel" },
    ]);
  };

  const getExpiryLabel = (daysLeft: number) => {
    if (daysLeft <= 0) return "Đã hết hạn";
    if (daysLeft === 1) return "Còn 1 ngày";
    return `Còn ${daysLeft} ngày`;
  };

  const getExpiryColor = (daysLeft: number) => {
    if (daysLeft <= 0) return C.red;
    if (daysLeft <= 3) return C.orange;
    return C.green;
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <AppHeader showNotification unreadCount={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* TITLE + ADD BUTTON */}
        <View style={styles.headingRow}>
          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>QUẢN LÝ KHO LẠNH & TỦ ĐỒ</Text>

            <Text style={styles.pageTitle}>Kho thực phẩm</Text>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() => goTo("/add-ingredient")}
          >
            <Plus size={17} color={C.white} />
            <Text style={styles.addButtonText}>Thêm nguyên liệu</Text>
          </Pressable>
        </View>

        {/* BACK + SEARCH */}
        <View style={styles.searchRow}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={21} color={C.orange} />
          </Pressable>

          <View style={styles.searchBox}>
            <Search size={18} color={C.muted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm kiếm nguyên liệu..."
              placeholderTextColor="#A18B81"
            />
          </View>

          <Pressable
            style={styles.smallIconButton}
            onPress={() =>
              Alert.alert(
                "Bộ lọc",
                "Chọn vị trí bảo quản hoặc trạng thái hạn sử dụng bên dưới.",
              )
            }
          >
            <SlidersHorizontal size={19} color={C.orange} />
          </Pressable>

          <Pressable
            style={styles.smallIconButton}
            onPress={() => goTo("/scan")}
          >
            <ScanLine size={19} color={C.orange} />
          </Pressable>
        </View>

        {/* OVERVIEW */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={styles.inlineTitle}>
              <View style={styles.greenDot} />
              <Text style={styles.overviewTitle}>Tình trạng bảo quản</Text>
            </View>

            <Text style={styles.updatedText}>Dữ liệu hiện tại</Text>
          </View>

          <View style={styles.statGrid}>
            {[
              {
                title: "Tổng kho",
                value: total,
                sub: "nguyên liệu",
                bg: C.peach,
                color: C.orange,
              },
              {
                title: "Tươi ngon",
                value: freshCount,
                sub: "an toàn",
                bg: C.greenLight,
                color: C.green,
              },
              {
                title: "Cận date",
                value: expiringCount,
                sub: "≤ 3 ngày",
                bg: C.yellow,
                color: C.orange,
              },
              {
                title: "Hết hạn",
                value: expiredCount,
                sub: "cần xử lý",
                bg: C.redLight,
                color: C.red,
              },
            ].map((stat) => (
              <View
                key={stat.title}
                style={[styles.statCard, { backgroundColor: stat.bg }]}
              >
                <Text style={[styles.statTitle, { color: stat.color }]}>
                  {stat.title}
                </Text>

                <Text style={[styles.statValue, { color: stat.color }]}>
                  {stat.value}
                </Text>

                <Text style={[styles.statSub, { color: stat.color }]}>
                  {stat.sub}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI ALERT */}
        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Sparkles size={21} color={C.white} />
          </View>

          <View style={styles.aiContent}>
            <Text style={styles.aiEyebrow}>TRỢ LÝ KHO AI</Text>

            <Text style={styles.aiTitle}>
              {expiringCount > 0
                ? `Có ${expiringCount} nguyên liệu sắp hết hạn`
                : "Kho thực phẩm đang được bảo quản tốt"}
            </Text>

            <Text style={styles.aiDescription}>
              {expiringCount > 0
                ? "Ưu tiên sử dụng thực phẩm gần hết hạn để tránh lãng phí."
                : "Hãy tiếp tục kiểm tra và cập nhật kho thường xuyên."}
            </Text>

            <Pressable style={styles.aiButton} onPress={() => goTo("/recipes")}>
              <ChefHat size={14} color={C.white} />
              <Text style={styles.aiButtonText}>Xem công thức gợi ý</Text>
              <ChevronRight size={14} color={C.white} />
            </Pressable>
          </View>
        </View>

        {/* LOCATION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vị trí bảo quản</Text>

          <Text style={styles.sectionLink}>Chọn ngăn lưu trữ</Text>
        </View>

        <View style={styles.locationRow}>
          {LOCATIONS.map(({ key, icon: Icon }) => {
            const active = selectedLocation === key;

            return (
              <Pressable
                key={key}
                style={[
                  styles.locationButton,
                  active && styles.locationButtonActive,
                ]}
                onPress={() => setSelectedLocation(key)}
              >
                <Icon size={16} color={active ? C.white : C.orange} />

                <Text
                  style={[
                    styles.locationText,
                    active && styles.locationTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {key}
                </Text>

                <View
                  style={[
                    styles.locationCount,
                    active && styles.locationCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.locationCountText,
                      active && styles.locationCountTextActive,
                    ]}
                  >
                    {locationCounts[key]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* STATUS FILTERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {[
            { key: "all", label: "Tất cả" },
            { key: "expiring", label: "Sắp hết hạn (≤ 3 ngày)" },
            { key: "expired", label: "Đã hết hạn" },
          ].map((item) => {
            const active = statusFilter === item.key;

            return (
              <Pressable
                key={item.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setStatusFilter(item.key as StatusFilter)}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {loading && (
          <Text
            style={{
              textAlign: "center",
              color: C.orange,
              marginVertical: 12,
            }}
          >
            Đang tải kho thực phẩm...
          </Text>
        )}
        {/* INGREDIENT LIST */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Danh sách nguyên liệu</Text>

          <Text style={styles.listCount}>
            {filteredIngredients.length} nguyên liệu
          </Text>
        </View>

        {filteredIngredients.length === 0 ? (
          <View style={styles.emptyCard}>
            <ShoppingBasket size={34} color={C.orange} />
            <Text style={styles.emptyTitle}>Không tìm thấy nguyên liệu</Text>
            <Text style={styles.emptyText}>
              Hãy thử đổi bộ lọc hoặc thêm nguyên liệu mới.
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={() => goTo("/add-ingredient")}
            >
              <Plus size={16} color={C.white} />
              <Text style={styles.emptyButtonText}>Thêm nguyên liệu</Text>
            </Pressable>
          </View>
        ) : (
          filteredIngredients.map((item) => {
            const urgent = item.daysLeft <= 3;

            return (
              <View
                key={item.id}
                style={[
                  styles.ingredientCard,
                  urgent && styles.ingredientCardUrgent,
                ]}
              >
                <Pressable
                  style={styles.ingredientMain}
                  onPress={() => showIngredientDetail(item)}
                >
                  <View
                    style={[
                      styles.ingredientImage,
                      {
                        backgroundColor: urgent ? C.peach : C.greenLight,
                      },
                    ]}
                  >
                    <Text style={styles.ingredientEmoji}>{item.emoji}</Text>
                  </View>

                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName} numberOfLines={1}>
                      {item.name}
                    </Text>

                    <Text
                      style={styles.ingredientDescription}
                      numberOfLines={1}
                    >
                      {item.description} · {item.quantity}
                    </Text>

                    <View style={styles.ingredientMeta}>
                      <View style={styles.locationBadge}>
                        <Refrigerator size={11} color={C.green} />
                        <Text style={styles.locationBadgeText}>
                          {item.location}
                        </Text>
                      </View>

                      <View style={styles.expiryBadge}>
                        {urgent ? (
                          <AlertTriangle
                            size={12}
                            color={getExpiryColor(item.daysLeft)}
                          />
                        ) : (
                          <CheckCircle2 size={12} color={C.green} />
                        )}

                        <Text
                          style={[
                            styles.expiryText,
                            {
                              color: getExpiryColor(item.daysLeft),
                            },
                          ]}
                        >
                          {getExpiryLabel(item.daysLeft)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>

                <View style={styles.ingredientFooter}>
                  <Text style={styles.ingredientFooterText}>
                    {item.daysLeft <= 0
                      ? "Cần kiểm tra và xử lý"
                      : item.daysLeft <= 3
                        ? "Ưu tiên sử dụng sớm"
                        : "Đang được bảo quản"}
                  </Text>

                  <View style={styles.ingredientActions}>
                    <Pressable
                      style={[
                        styles.actionButton,
                        !urgent && styles.actionButtonLight,
                      ]}
                      onPress={() => handleIngredientAction(item)}
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          !urgent && styles.actionButtonTextLight,
                        ]}
                      >
                        {item.daysLeft <= 0
                          ? "Kiểm tra"
                          : urgent
                            ? "Gợi ý món"
                            : "Xem món"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.moreButton}
                      onPress={() => handleMenu(item)}
                    >
                      <MoreVertical size={17} color={C.muted} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 35,
  },

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
    gap: 8,
  },

  headingText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: C.orange,
    marginBottom: 5,
  },

  pageTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: C.dark,
  },

  addButton: {
    backgroundColor: C.orange,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 39,
  },

  addButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.white,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
  },

  backButton: {
    width: 36,
    height: 41,
    borderRadius: 11,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },

  searchBox: {
    flex: 1,
    height: 41,
    backgroundColor: C.white,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 6,
  },

  searchInput: {
    flex: 1,
    fontSize: 11,
    color: C.dark,
    paddingVertical: 0,
  },

  smallIconButton: {
    width: 36,
    height: 41,
    borderRadius: 11,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },

  overviewCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 12,
  },

  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  inlineTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
  },

  overviewTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },

  updatedText: {
    fontSize: 9,
    color: C.muted,
  },

  statGrid: {
    flexDirection: "row",
    gap: 6,
  },

  statCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 5,
    alignItems: "center",
    minHeight: 77,
  },

  statTitle: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },

  statValue: {
    fontSize: 19,
    fontWeight: "800",
    marginTop: 6,
  },

  statSub: {
    fontSize: 8,
    marginTop: 3,
    textAlign: "center",
  },

  capacityHeader: {
    marginTop: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  capacityTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: C.dark,
  },

  capacityNote: {
    fontSize: 9,
    color: C.green,
  },

  capacityRow: {
    flexDirection: "row",
    gap: 7,
  },

  capacityItem: {
    flex: 1,
    borderRadius: 9,
    padding: 8,
    backgroundColor: C.cream,
  },

  capacityName: {
    fontSize: 9,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 8,
  },

  progressTrack: {
    height: 5,
    borderRadius: 5,
    backgroundColor: "#EADBD3",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: C.orange,
    borderRadius: 5,
  },

  capacityPercent: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: "800",
    color: C.orange,
  },

  aiCard: {
    backgroundColor: C.peach,
    borderWidth: 1,
    borderColor: "#E7C7B7",
    borderRadius: 16,
    padding: 13,
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },

  aiIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },

  aiContent: {
    flex: 1,
  },

  aiEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: C.orange,
    letterSpacing: 0.5,
  },

  aiTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.dark,
    marginTop: 5,
  },

  aiDescription: {
    fontSize: 10,
    color: C.muted,
    lineHeight: 15,
    marginTop: 5,
  },

  aiButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.orange,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },

  aiButtonText: {
    color: C.white,
    fontSize: 10,
    fontWeight: "800",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.dark,
  },

  sectionLink: {
    fontSize: 10,
    color: C.orange,
    fontWeight: "700",
  },

  locationRow: {
    flexDirection: "row",
    gap: 7,
  },

  locationButton: {
    flex: 1,
    minWidth: 0,
    height: 37,
    borderRadius: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 3,
  },

  locationButtonActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },

  locationText: {
    fontSize: 9,
    fontWeight: "700",
    color: C.muted,
  },

  locationTextActive: {
    color: C.white,
  },

  locationCount: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: C.peach,
  },

  locationCountActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  locationCountText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.orange,
  },

  locationCountTextActive: {
    color: C.white,
  },

  filterRow: {
    paddingVertical: 15,
    gap: 8,
  },

  filterChip: {
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
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

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  listTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.dark,
  },

  listCount: {
    fontSize: 10,
    color: C.muted,
  },

  ingredientCard: {
    backgroundColor: C.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 11,
    padding: 10,
  },

  ingredientCardUrgent: {
    borderColor: "#EBC0AD",
  },

  ingredientMain: {
    flexDirection: "row",
    gap: 10,
  },

  ingredientImage: {
    width: 76,
    height: 75,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  ingredientEmoji: {
    fontSize: 34,
  },

  ingredientInfo: {
    flex: 1,
    paddingTop: 3,
  },

  ingredientName: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },

  ingredientDescription: {
    fontSize: 10,
    color: C.muted,
    marginTop: 5,
  },

  ingredientMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },

  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: C.greenLight,
  },

  locationBadgeText: {
    fontSize: 9,
    color: C.green,
    fontWeight: "700",
  },

  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },

  expiryText: {
    fontSize: 9,
    fontWeight: "800",
  },

  ingredientFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F4EAE5",
    paddingTop: 9,
    marginTop: 9,
    gap: 8,
  },

  ingredientFooterText: {
    fontSize: 9,
    color: C.muted,
    flex: 1,
  },

  ingredientActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  actionButton: {
    backgroundColor: C.orange,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },

  actionButtonLight: {
    backgroundColor: C.peach,
  },

  actionButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.white,
  },

  actionButtonTextLight: {
    color: C.orange,
  },

  moreButton: {
    width: 27,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 27,
    alignItems: "center",
    gap: 10,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
  },

  emptyText: {
    fontSize: 11,
    color: C.muted,
    textAlign: "center",
    lineHeight: 17,
  },

  emptyButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.orange,
  },

  emptyButtonText: {
    color: C.white,
    fontSize: 11,
    fontWeight: "800",
  },
});
