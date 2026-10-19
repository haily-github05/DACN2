import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  MoreVertical,
  Clock3,
  Leaf,
  Sparkles,
  AlertTriangle,
  ChefHat,
  ChevronRight,
  Pencil,
  Trash2,
  UtensilsCrossed,
  Package,
  MapPin,
} from "lucide-react-native";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import {
  Ingredient,
  findIngredient,
  deleteIngredient,
  daysUntil,
} from "../lib/ingredients";
const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  green: "#397C57",
  mint: "#E9F5EB",
  red: "#C83D2B",
};
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900";
const TIPS: Record<string, string> = {
  Thịt: "Bảo quản thịt theo hướng dẫn trên bao bì, giữ lạnh đúng nhiệt độ và tránh lây nhiễm chéo với thực phẩm ăn liền.",
  "Rau củ":
    "Bảo quản rau củ phù hợp từng loại, loại bỏ phần hư hỏng và rửa sạch trước khi chế biến.",
  Sữa: "Giữ lạnh theo hướng dẫn trên bao bì, đậy kín sau khi mở và chú ý hạn sử dụng.",
};
export default function IngredientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const found = id ? await findIngredient(id) : null;
          if (active) setIngredient(found);
        } catch (e) {
          Alert.alert("Lỗi", "Không thể đọc dữ liệu nguyên liệu.");
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [id]),
  );
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/pantry");
  function confirmDelete() {
    if (!ingredient) return;
    Alert.alert(
      "Xóa nguyên liệu",
      `Bạn có chắc muốn xóa “${ingredient.name}” khỏi kho?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteIngredient(ingredient.id);
              router.replace("/pantry");
            } catch (e) {
              Alert.alert("Lỗi", "Không thể xóa nguyên liệu.");
            }
          },
        },
      ],
    );
  }
  function edit() {
    if (ingredient)
      router.push({
        pathname: "/edit-ingredient",
        params: { id: ingredient.id },
      });
  }
  function menu() {
    Alert.alert("Tùy chọn nguyên liệu", ingredient?.name, [
      { text: "Chỉnh sửa", onPress: edit },
      { text: "Xóa nguyên liệu", style: "destructive", onPress: confirmDelete },
      { text: "Hủy", style: "cancel" },
    ]);
  }
  const days = ingredient ? daysUntil(ingredient.expiryDate) : null;
  const urgent = days !== null && days <= 3;
  const expired = days !== null && days < 0;
  const badge =
    days === null
      ? "Chưa có hạn dùng"
      : expired
        ? "Đã quá hạn"
        : days === 0
          ? "Hết hạn hôm nay"
          : `Còn ${days} ngày`;
  return (
    <SafeAreaView style={s.screen} edges={["left", "right"]}>
      <AppHeader />
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.orange} />
        </View>
      ) : !ingredient ? (
        <View style={s.center}>
          <Package color={C.muted} size={42} />
          <Text style={s.title}>Không tìm thấy nguyên liệu</Text>
          <Text style={s.sub}>Hãy chọn lại nguyên liệu từ Kho thực phẩm.</Text>
          <Pressable
            style={s.mainButton}
            onPress={() => router.replace("/pantry")}
          >
            <Text style={s.mainButtonText}>Về kho thực phẩm</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={s.localHeader}>
            <Pressable style={s.iconButton} onPress={goBack}>
              <ArrowLeft color={C.orange} size={21} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Chi tiết nguyên liệu</Text>
              <Text style={s.sub} numberOfLines={1}>
                Kho thực phẩm › {ingredient.name}
              </Text>
            </View>
            <Pressable style={s.iconButton} onPress={edit}>
              <Pencil color={C.orange} size={19} />
            </Pressable>
            <Pressable style={s.iconButton} onPress={menu}>
              <MoreVertical color={C.orange} size={20} />
            </Pressable>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.hero}>
              <Image
                source={{ uri: ingredient.image || FALLBACK_IMAGE }}
                style={s.heroImage}
              />
              <View style={s.heroBadges}>
                <View style={s.badge}>
                  <Leaf color={C.green} size={13} />
                  <Text style={s.badgeText}>Thông tin thực phẩm</Text>
                </View>
              </View>
              <View style={s.heroBottom}>
                <Text style={s.heroTitle}>{ingredient.name}</Text>
                <Text style={s.heroSub}>
                  {ingredient.quantity} {ingredient.unit} ·{" "}
                  {ingredient.category}
                </Text>
              </View>
            </View>
            <View style={s.card}>
              <View style={s.row}>
                <Clock3 color={C.orange} size={18} />
                <Text style={s.cardTitle}>Theo dõi hạn sử dụng</Text>
                <View
                  style={[
                    s.status,
                    { backgroundColor: urgent ? C.peach : C.mint },
                  ]}
                >
                  <Text
                    style={{
                      color: urgent ? C.red : C.green,
                      fontWeight: "800",
                      fontSize: 11,
                    }}
                  >
                    {badge}
                  </Text>
                </View>
              </View>
              <View style={s.dates}>
                <Text style={s.sub}>
                  Ngày mua: {ingredient.purchaseDate || "Chưa cập nhật"}
                </Text>
                <Text style={s.sub}>
                  Hạn dùng: {ingredient.expiryDate || "Chưa cập nhật"}
                </Text>
              </View>
              {urgent && (
                <View style={s.warning}>
                  <AlertTriangle size={17} color={C.red} />
                  <Text style={{ color: C.red, flex: 1, fontSize: 12 }}>
                    {expired
                      ? "Thực phẩm đã quá hạn. Không nên sử dụng."
                      : "Ưu tiên kiểm tra và sử dụng sớm nếu thực phẩm còn an toàn."}
                  </Text>
                </View>
              )}
            </View>
            <View style={s.card}>
              <View style={s.row}>
                <MapPin color={C.orange} size={18} />
                <Text style={s.cardTitle}>Bảo quản</Text>
              </View>
              <Text style={s.body}>
                Vị trí: {ingredient.location || "Chưa cập nhật"}
              </Text>
              <View style={s.tip}>
                <Sparkles size={18} color={C.green} />
                <Text
                  style={{
                    color: C.dark,
                    flex: 1,
                    fontSize: 12,
                    lineHeight: 19,
                  }}
                >
                  {TIPS[ingredient.category] ||
                    "Bảo quản theo hướng dẫn của nhà sản xuất và kiểm tra chất lượng trước khi sử dụng."}
                </Text>
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Thông tin nguyên liệu</Text>
              <Text style={s.body}>Danh mục: {ingredient.category}</Text>
              <Text style={s.body}>
                Số lượng: {ingredient.quantity} {ingredient.unit}
              </Text>
              <Text style={s.body}>
                Ghi chú: {ingredient.note || "Chưa có ghi chú"}
              </Text>
            </View>
            <View style={s.card}>
              <View style={s.row}>
                <ChefHat color={C.orange} size={18} />
                <Text style={s.cardTitle}>Gợi ý món nấu ngay</Text>
              </View>
              <Text style={s.body}>
                Khám phá các món ăn có thể chế biến với {ingredient.name}.
              </Text>
              <Pressable
                style={s.secondaryButton}
                onPress={() =>
                  router.push({
                    pathname: "/recipes",
                    params: { search: ingredient.name },
                  })
                }
              >
                <UtensilsCrossed color={C.orange} size={17} />
                <Text style={s.secondaryText}>Xem công thức</Text>
                <ChevronRight color={C.orange} size={16} />
              </Pressable>
            </View>
            <View style={s.actionRow}>
              <Pressable
                style={[s.secondaryButton, { flex: 1 }]}
                onPress={edit}
              >
                <Pencil color={C.orange} size={17} />
                <Text style={s.secondaryText}>Chỉnh sửa</Text>
              </Pressable>
              <Pressable
                style={[s.secondaryButton, { flex: 1 }]}
                onPress={confirmDelete}
              >
                <Trash2 color={C.red} size={17} />
                <Text style={[s.secondaryText, { color: C.red }]}>Xóa</Text>
              </Pressable>
            </View>
            <Pressable
              style={s.mainButton}
              onPress={() =>
                router.push({
                  pathname: "/recipes",
                  params: { search: ingredient.name },
                })
              }
            >
              <UtensilsCrossed color="white" size={18} />
              <Text style={s.mainButtonText}>
                Nấu món với {ingredient.name}
              </Text>
            </Pressable>
          </ScrollView>
        </>
      )}
      <BottomNav />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  localHeader: {
    height: 66,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "800", color: C.dark },
  sub: { fontSize: 11, color: C.muted, marginTop: 4 },
  content: { padding: 15, paddingBottom: 30 },
  hero: {
    height: 240,
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: C.peach,
    marginBottom: 14,
  },
  heroImage: { width: "100%", height: "100%" },
  heroBadges: { position: "absolute", top: 12, left: 12 },
  badge: {
    backgroundColor: C.mint,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: C.green },
  heroBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: "rgba(32,26,23,0.78)",
  },
  heroTitle: { fontSize: 20, fontWeight: "800", color: C.white },
  heroSub: { color: "#F2E8E2", fontSize: 12, marginTop: 6 },
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 15,
    marginBottom: 13,
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: C.dark, flex: 1 },
  status: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
  dates: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 7,
  },
  warning: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFF0EC",
  },
  body: { fontSize: 12, lineHeight: 20, color: C.dark },
  tip: {
    flexDirection: "row",
    gap: 9,
    backgroundColor: C.mint,
    padding: 12,
    borderRadius: 10,
  },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 13 },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: C.peach,
    padding: 13,
    borderRadius: 12,
  },
  secondaryText: { fontSize: 12, fontWeight: "800", color: C.orange },
  mainButton: {
    minHeight: 49,
    backgroundColor: C.orange,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  mainButtonText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
});
